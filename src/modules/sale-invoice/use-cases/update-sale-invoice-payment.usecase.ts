import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import {
  PaymentStatus,
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
} from '../../../generated/prisma/client';
import { UpdateSaleInvoicePaymentDto } from '../dto/update-sale-invoice-payment.dto';
import { SaleInvoicePostingService } from '../services/sale-invoice-posting.service';

@Injectable()
export class UpdateSaleInvoicePaymentUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly saleInvoicePostingService: SaleInvoicePostingService,
  ) {}

  execute(
    pharmacyId: number,
    saleInvoiceId: number,
    dto: UpdateSaleInvoicePaymentDto,
  ) {
    return this.unitOfWork.executeSerializable(async (tx) => {
      const saleInvoice = await tx.saleInvoice.findFirst({
        where: {
          saleInvoiceId,
          pharmacyInvoice: {
            pharmacyId,
            invoiceType: PharmacyInvoiceType.SALE,
          },
        },
        select: {
          saleInvoiceId: true,
          totalAmount: true,
          paidAmount: true,
          paymentStatus: true,

          pharmacyInvoice: {
            select: {
              status: true,
              patientId: true,
            },
          },

          returns: {
            where: {
              pharmacyInvoice: {
                status: PharmacyInvoiceStatus.POSTED,
              },
            },
            select: {
              subtotalRefund: true,
            },
          },
        },
      });

      if (!saleInvoice) {
        throw new NotFoundException('Sale invoice not found');
      }

      if (saleInvoice.pharmacyInvoice.status !== PharmacyInvoiceStatus.POSTED) {
        throw new ConflictException(
          'Only posted sale invoices can receive payments',
        );
      }

      const totalAmount = this.roundMoney(Number(saleInvoice.totalAmount));

      const returnedAmount = this.roundMoney(
        saleInvoice.returns.reduce(
          (sum, returnInvoice) => sum + Number(returnInvoice.subtotalRefund),
          0,
        ),
      );

      const payableAmount = this.roundMoney(
        Math.max(totalAmount - returnedAmount, 0),
      );

      const payment = this.saleInvoicePostingService.resolvePayment(
        dto.paymentStatus,
        dto.paidAmount,
        payableAmount,
      );

      const currentPaidAmount = this.roundMoney(Number(saleInvoice.paidAmount));

      /*
       * هذا الـAPI مخصص لتحصيل الدفعات، لذلك لا يسمح بتقليل
       * المبلغ المدفوع سابقاً.
       */
      if (this.toCents(payment.paidAmount) < this.toCents(currentPaidAmount)) {
        throw new BadRequestException(
          'paidAmount cannot be less than the currently paid amount',
        );
      }

      /*
       * الفواتير المعلقة أو المدفوعة جزئياً تمثل ديناً،
       * لذلك يجب أن تكون مرتبطة بمريض.
       */
      if (
        payment.paymentStatus !== PaymentStatus.PAID &&
        !saleInvoice.pharmacyInvoice.patientId
      ) {
        throw new BadRequestException(
          'Patient is required for pending or partial sale invoices',
        );
      }

      const updatedSaleInvoice = await tx.saleInvoice.update({
        where: {
          saleInvoiceId,
        },
        data: {
          paymentStatus: payment.paymentStatus,
          paidAmount: payment.paidAmount,
        },
        select: {
          saleInvoiceId: true,
          paymentStatus: true,
          paidAmount: true,
          totalAmount: true,
          updatedAt: true,
        },
      });

      return {
        ...updatedSaleInvoice,
        returnedAmount,
        payableAmount,
        remainingAmount: this.roundMoney(payableAmount - payment.paidAmount),
      };
    });
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toCents(value: number): number {
    return Math.round((value + Number.EPSILON) * 100);
  }
}

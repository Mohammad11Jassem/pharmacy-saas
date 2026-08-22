import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import { SupplierInvoiceStatus } from '../../../generated/prisma/client';
import { UpdateSupplierInvoicePaymentDto } from '../dto/update-supplier-invoice-payment.dto';
import {
  calculateSupplierPaymentSummary,
  resolveSupplierPayment,
  toMoneyCents,
} from '../utils/supplier-payment.util';

@Injectable()
export class UpdateSupplierInvoicePaymentUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  execute(
    pharmacyId: number,
    supplierInvoiceId: number,
    dto: UpdateSupplierInvoicePaymentDto,
  ) {
    return this.unitOfWork.executeSerializable(async (tx) => {
      const supplierInvoice = await tx.supplierInvoice.findFirst({
        where: {
          supplierInvoiceId,
          supplier: {
            pharmacyId,
          },
        },
        select: {
          supplierInvoiceId: true,
          totalPrice: true,
          paidAmount: true,
          paymentStatus: true,
          status: true,
        },
      });

      if (!supplierInvoice) {
        throw new NotFoundException('Supplier invoice not found');
      }

      if (supplierInvoice.status === SupplierInvoiceStatus.CANCELLED) {
        throw new ConflictException(
          'Cancelled supplier invoices cannot receive payments',
        );
      }

      const payment = resolveSupplierPayment(
        dto.paymentStatus,
        dto.paidAmount,
        supplierInvoice.totalPrice,
      );

      if (
        toMoneyCents(payment.paidAmount) <
        toMoneyCents(supplierInvoice.paidAmount)
      ) {
        throw new BadRequestException(
          'paidAmount cannot be less than the currently paid amount',
        );
      }

      const updatedSupplierInvoice = await tx.supplierInvoice.update({
        where: {
          supplierInvoiceId,
        },
        data: {
          paymentStatus: payment.paymentStatus,
          paidAmount: payment.paidAmount,
        },
        select: {
          supplierInvoiceId: true,
          paymentStatus: true,
          paidAmount: true,
          totalPrice: true,
          updatedAt: true,
        },
      });

      return {
        ...updatedSupplierInvoice,
        ...calculateSupplierPaymentSummary(
          updatedSupplierInvoice.totalPrice,
          updatedSupplierInvoice.paidAmount,
        ),
      };
    });
  }
}

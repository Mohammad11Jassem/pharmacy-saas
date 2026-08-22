import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import { SaleType } from '../../../generated/prisma/client';
import { CreateSaleInvoiceDto } from '../dto/create-sale-invoice.dto';
import { SaleInvoicePostingService } from '../services/sale-invoice-posting.service';
import { SendLowStockNotificationsAfterSaleUseCase } from '../../../notification/use-cases/send-low-stock-notifications-after-sale.usecase';

@Injectable()
export class CreateSaleInvoiceUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly saleInvoicePostingService: SaleInvoicePostingService,
    private readonly sendLowStockNotificationsAfterSaleUseCase: SendLowStockNotificationsAfterSaleUseCase,
  ) {}

  async execute(pharmacyId: number, dto: CreateSaleInvoiceDto) {
    const result = await this.unitOfWork.executeSerializable((tx) =>
      this.saleInvoicePostingService.post(tx, pharmacyId, {
        idempotencyKey: dto.idempotencyKey,
        patientId: dto.patientId,
        patient: dto.patient,
        invoiceDate: dto.invoiceDate,
        paymentStatus: dto.paymentStatus,
        paidAmount: dto.paidAmount,
        saleType: dto.saleType ?? SaleType.NORMAL,
        discount: dto.discount,
        notes: dto.notes,

        items: dto.items.map((item) => ({
          pharmacyDrugId: item.pharmacyDrugId,

          unitType: item.unitType,

          displayQuantity: item.displayQuantity,

          extraPercentage: item.extraPercentage,

          manualUnitPrice: item.manualUnitPrice,

          batchAllocations: item.batchAllocations?.map((allocation) => ({
            batchId: allocation.batchId,

            displayQuantity: allocation.displayQuantity,
          })),
        })),
      }),
    );

    await this.sendLowStockNotificationsAfterSaleUseCase.execute(
      pharmacyId,

      result.items.map((item) => ({
        pharmacyDrugId: item.pharmacyDrugId,

        baseQuantity: item.baseQuantity,
      })),
    );

    return result;
  }
}

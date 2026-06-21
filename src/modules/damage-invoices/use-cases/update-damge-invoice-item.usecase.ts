import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import { PharmacyInvoiceStatus } from '../../../generated/prisma/enums';
import { UpdateDamageInvoiceItemDto } from '../dto/update-damage-invoice-item.dto';
import { calculateBatchAvailableQuantity } from '../helpers/calculate-batch-available-quantity.helper';

@Injectable()
export class UpdateDamageInvoiceItemUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(
    pharmacyId: number,
    damageInvoiceId: number,// for delete
    itemId: number,
    dto: UpdateDamageInvoiceItemDto,
  ) {
    return this.unitOfWork.execute(async (tx) => {
      const item =
        await tx.damageInvoiceItem.findFirst({
          where: {
            damageInvoiceItemId:
              itemId,

            damageInvoiceId,// for delete

            damageInvoice: {
              pharmacyInvoice: {
                pharmacyId,
              },
            },
          },
          select: {
            damageInvoiceItemId: true,
            batchId: true,
            quantityDamaged: true,

            damageInvoice: {
              select: {
                pharmacyInvoice: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        });

      if (!item) {
        throw new NotFoundException(
          'Damage invoice item not found',
        );
      }

      if (
        item.damageInvoice.pharmacyInvoice.status ===
        PharmacyInvoiceStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Cannot update item of cancelled invoice',
        );
      }

      const newQuantity =
        dto.quantityDamaged ?? item.quantityDamaged;

      const delta =
        newQuantity - item.quantityDamaged;

      if (delta > 0) {
        const batch = await tx.batch.findUnique({
          where: {
            batchId:
              item.batchId,
          },
          select: {
            initialQuantity: true,
            soldQuantity: true,
          },
        });

        if (!batch) {
          throw new NotFoundException(
            'Batch not found',
          );
        }

        const availableQuantity =
          calculateBatchAvailableQuantity(batch);

        if (delta > availableQuantity) {
          throw new BadRequestException(
            'New damaged quantity exceeds available quantity',
          );
        }
      }

      const updatedItem =
        await tx.damageInvoiceItem.update({
          where: {
            damageInvoiceItemId:
              itemId,
          },
          data: {
            quantityDamaged:
              dto.quantityDamaged,

            damageReason:
              dto.damageReason,

            notes:
              dto.notes !== undefined
                ? dto.notes?.trim()
                : undefined,
          },
        });

      if (delta !== 0) {
        await tx.batch.update({
          where: {
            batchId:
              item.batchId,
          },
          data: {
            soldQuantity:
              delta > 0
                ? {
                    increment:
                      delta,
                  }
                : {
                    decrement:
                      Math.abs(delta),
                  },
          },
        });

        
      }

      return updatedItem;
    });
  }
}
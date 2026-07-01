import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import { PharmacyInvoiceStatus } from '../../../generated/prisma/enums';
import { CreateDamageInvoiceItemDto } from '../dto/create-damage-invoice-item.dto';
import { calculateBatchAvailableQuantity } from '../helpers/calculate-batch-available-quantity.helper';

@Injectable()
export class AddDamageInvoiceItemUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(
    pharmacyId: number,
    damageInvoiceId: number,
    dto: CreateDamageInvoiceItemDto,
  ) {
    return this.unitOfWork.execute(async (tx) => {
      const damageInvoice =
        await tx.damageInvoice.findFirst({
          where: {
            damageInvoiceId,

            pharmacyInvoice: {
              pharmacyId,
            },
          },
          select: {
            damageInvoiceId: true,

            pharmacyInvoice: {
              select: {
                status: true,
              },
            },
          },
        });

      if (!damageInvoice) {
        throw new NotFoundException(
          'Damage invoice not found',
        );
      }

      if (
        damageInvoice.pharmacyInvoice.status ===
        PharmacyInvoiceStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Cannot add item to cancelled invoice',
        );
      }

      const batch = await tx.batch.findFirst({
        where: {
          batchId: dto.batchId,

          pharmacyDrug: {
            pharmacyId,
          },
        },
        select: {
          batchId: true,
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

      if (dto.quantityDamaged > availableQuantity) {
        throw new BadRequestException(
          'Damaged quantity exceeds available quantity',
        );
      }

      const item =
        await tx.damageInvoiceItem.create({
          data: {
            damageInvoiceId,

            batchId:
              dto.batchId,

            quantityDamaged:
              dto.quantityDamaged,

            notes:
              dto.notes?.trim(),
          },
        });

      await tx.batch.update({
        where: {
          batchId:
            dto.batchId,
        },
        data: {
          soldQuantity: {
            increment:
              dto.quantityDamaged,
          },
        },
      });

      

      return item;
    });
  }
}
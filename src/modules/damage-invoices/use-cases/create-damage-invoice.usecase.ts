import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import {
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
} from '../../../generated/prisma/enums';
import { CreateDamageInvoiceDto } from '../dto/create-damage-invoice.dto';
import { calculateBatchAvailableQuantity } from '../helpers/calculate-batch-available-quantity.helper';

@Injectable()
export class CreateDamageInvoiceUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(
    pharmacyId: number,
    dto: CreateDamageInvoiceDto,
  ) {
    return this.unitOfWork.execute(async (tx) => {
      const batchIds = dto.items.map((item) => item.batchId);

      const uniqueBatchIds = [...new Set(batchIds)];

    //   if (uniqueBatchIds.length !== batchIds.length) {
    //     throw new BadRequestException(
    //       'Duplicate batch ids are not allowed',
    //     );
    //   }

      const batches = await tx.batch.findMany({
        where: {
          batchId: {
            in: uniqueBatchIds,
          },
          pharmacyDrug: {
            pharmacyId,
          },
        },
        select: {
          batchId: true,
          initialQuantity: true,
          soldQuantity: true,
          pharmacyDrugId: true,
        },
      });

      if (batches.length !== uniqueBatchIds.length) {
        throw new NotFoundException(
          'One or more batches not found',
        );
      }

      const batchMap = new Map(
        batches.map((batch) => [
          batch.batchId,
          batch,
        ]),
      );

      for (const item of dto.items) {
        const batch = batchMap.get(item.batchId);

        if (!batch) {
          throw new NotFoundException(
            `Batch not found: ${item.batchId}`,
          );
        }

        const availableQuantity =
          calculateBatchAvailableQuantity(batch);

        if (item.quantityDamaged > availableQuantity) {
          throw new BadRequestException(
            `Damaged quantity exceeds available quantity for batch ${item.batchId}`,
          );
        }
      }

      const pharmacyInvoice =
        await tx.pharmacyInvoice.create({
          data: {
            pharmacyId,

            invoiceType:
              PharmacyInvoiceType.DAMAGE,

            invoiceDate:
              dto.invoiceDate
                ? new Date(dto.invoiceDate)
                : new Date(),

            notes:
              dto.notes?.trim(),

            status:
              PharmacyInvoiceStatus.POSTED,
          },
        });

      const damageInvoice =
        await tx.damageInvoice.create({
          data: {
            pharmacyInvoiceId:
              pharmacyInvoice.pharmacyInvoiceId,
          },
        });

      await tx.damageInvoiceItem.createMany({
        data: dto.items.map((item) => ({
          damageInvoiceId:
            damageInvoice.damageInvoiceId,

          batchId:
            item.batchId,

          quantityDamaged:
            item.quantityDamaged,

          damageReason:
            item.damageReason,

          notes:
            item.notes?.trim(),
        })),
      });

      for (const item of dto.items) {
        await tx.batch.update({
          where: {
            batchId:
              item.batchId,
          },
          data: {
            soldQuantity: {
              increment:
                item.quantityDamaged,
            },

          },
        });
      }

    return damageInvoice;
    //   return {
    //     pharmacyInvoiceId:
    //       pharmacyInvoice.pharmacyInvoiceId,

    //     damageInvoiceId:
    //       damageInvoice.damageInvoiceId,

    //     totalDamagedQuantity:
    //       damageInvoice.totalDamagedQuantity,
    //   };
    });
  }
}
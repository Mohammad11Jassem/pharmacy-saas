import { Injectable, Logger } from '@nestjs/common';

import { BatchStatus } from '../../generated/prisma/enums';

import { PrismaService } from '../../prisma/prisma.service';

import { NotificationRecipientType } from '../../generated/prisma/enums';

import { NotificationUseCase } from '../notification.use-case';

import {
  getDateOnlyInTimeZone,
  parseDateOnly,
} from '../../modules/daily-window/utils/date-only.util';

type SoldItem = {
  pharmacyDrugId: number;
  baseQuantity: number;
};

@Injectable()
export class SendLowStockNotificationsAfterSaleUseCase {
  private readonly logger = new Logger(
    SendLowStockNotificationsAfterSaleUseCase.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationUseCase: NotificationUseCase,
  ) {}

  async execute(pharmacyId: number, soldItems: SoldItem[]): Promise<void> {
    try {
      if (soldItems.length === 0) {
        return;
      }

      const soldQuantityByDrug = new Map<number, number>();

      for (const item of soldItems) {
        soldQuantityByDrug.set(
          item.pharmacyDrugId,

          (soldQuantityByDrug.get(item.pharmacyDrugId) ?? 0) +
            item.baseQuantity,
        );
      }

      const pharmacyDrugIds = [...soldQuantityByDrug.keys()];

      const today = parseDateOnly(getDateOnlyInTimeZone());

      const pharmacyDrugs = await this.prisma.pharmacyDrug.findMany({
        where: {
          pharmacyId,

          pharmacyDrugId: {
            in: pharmacyDrugIds,
          },

          isActive: true,

          minStockAlert: {
            not: null,
          },
        },

        select: {
          pharmacyDrugId: true,
          minStockAlert: true,

          drug: {
            select: {
              generalDrug: {
                select: {
                  tradeName: true,
                  unitsPerBox: true,
                },
              },

              privateDrug: {
                select: {
                  tradeName: true,
                  unitsPerBox: true,
                },
              },
            },
          },

          batches: {
            where: {
              status: BatchStatus.ACTIVE,

              initialQuantity: {
                gt: this.prisma.batch.fields.soldQuantity,
              },

              OR: [
                {
                  expiryDate: null,
                },
                {
                  expiryDate: {
                    gte: today,
                  },
                },
              ],
            },

            select: {
              initialQuantity: true,
              soldQuantity: true,
            },
          },
        },
      });

      for (const pharmacyDrug of pharmacyDrugs) {
        if (pharmacyDrug.minStockAlert === null) {
          continue;
        }

        const drugName =
          pharmacyDrug.drug.generalDrug?.tradeName ??
          pharmacyDrug.drug.privateDrug?.tradeName ??
          'Unknown drug';

        const unitsPerBox =
          pharmacyDrug.drug.generalDrug?.unitsPerBox ??
          pharmacyDrug.drug.privateDrug?.unitsPerBox ??
          1;

        if (unitsPerBox <= 0) {
          this.logger.warn(
            `Invalid unitsPerBox for pharmacyDrugId=${pharmacyDrug.pharmacyDrugId}`,
          );

          continue;
        }

        const currentStock = pharmacyDrug.batches.reduce(
          (total, batch) =>
            total + (batch.initialQuantity - batch.soldQuantity),
          0,
        );

        const thresholdInBaseUnits = pharmacyDrug.minStockAlert * unitsPerBox;

        const soldBaseQuantity =
          soldQuantityByDrug.get(pharmacyDrug.pharmacyDrugId) ?? 0;

        const previousStock = currentStock + soldBaseQuantity;

        const enteredLowStock =
          previousStock > thresholdInBaseUnits &&
          currentStock <= thresholdInBaseUnits;

        if (!enteredLowStock) {
          continue;
        }

        const fullBoxes = Math.floor(currentStock / unitsPerBox);

        const remainingUnits = currentStock % unitsPerBox;

        const remainingText =
          remainingUnits > 0
            ? `${fullBoxes} علبة و ${remainingUnits} وحدة`
            : `${fullBoxes} علبة`;

        try {
          await this.notificationUseCase.send({
            recipientType: NotificationRecipientType.PHARMACY,

            recipientId: pharmacyId,

            title: 'انخفاض مخزون دواء',

            body:
              `انخفض مخزون ${drugName} إلى ${remainingText}. ` +
              `حد التنبيه هو ${pharmacyDrug.minStockAlert} علبة.`,
          });
        } catch (error) {
          this.logger.error(
            `Failed to send low-stock notification for pharmacyDrugId=${pharmacyDrug.pharmacyDrugId}`,

            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to check low stock after sale for pharmacyId=${pharmacyId}`,

        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

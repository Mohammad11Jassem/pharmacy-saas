import { Injectable } from '@nestjs/common';

import { BatchStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

import {
  addDays,
  getDateOnlyInTimeZone,
  parseDateOnly,
} from '../utils/date-only.util';

export type InventoryAlertType = 'STOCK_ALERT' | 'EXPIRY_ALERT';

export type AlertQuantity = {
  // totalUnits: number;
  fullBoxes: number;
  remainingUnits: number;
};

export type InventoryAlertItem = {
  pharmacyDrugId: number;
  drugName: string;
  alertType: InventoryAlertType;
  quantity: AlertQuantity;
  expiryDate: Date | null;
};

@Injectable()
export class CurrentInventoryAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(pharmacyId: number): Promise<InventoryAlertItem[]> {
    const pharmacyDrugs = await this.prisma.pharmacyDrug.findMany({
      where: {
        pharmacyId,
        isActive: true,
      },

      select: {
        pharmacyDrugId: true,
        minStockAlert: true,
        expiryDateAlarm: true,

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
            /**
             * Load only batches that still have quantity.
             */
            initialQuantity: {
              // gt: this.prisma.batch.fields.soldQuantity,
              gt: 0,
            },

            status: {
              not: BatchStatus.DEPLETED,
            },
          },

          select: {
            initialQuantity: true,
            soldQuantity: true,
            expiryDate: true,
            status: true,
          },
        },
      },
    });

    const today = parseDateOnly(getDateOnlyInTimeZone());

    const alerts: InventoryAlertItem[] = [];

    for (const pharmacyDrug of pharmacyDrugs) {
      const drugName =
        pharmacyDrug.drug.generalDrug?.tradeName ??
        pharmacyDrug.drug.privateDrug?.tradeName ??
        'Unknown drug';

      /**
       * Get units per box from either
       * general or private drug.
       */
      const unitsPerBox =
        pharmacyDrug.drug.generalDrug?.unitsPerBox ??
        pharmacyDrug.drug.privateDrug?.unitsPerBox ??
        1;

      const expiryAlarmDays = Math.max(pharmacyDrug.expiryDateAlarm ?? 60, 0);

      const expiryAlertLimit = addDays(today, expiryAlarmDays);

      let availableQuantity = 0;
      let expiryAlertQuantity = 0;

      let earliestExpiryDate: Date | null = null;

      for (const batch of pharmacyDrug.batches) {
        const remainingQuantity = batch.initialQuantity - batch.soldQuantity;

        const isExpired =
          batch.status === BatchStatus.EXPIRED ||
          (batch.expiryDate !== null &&
            batch.expiryDate.getTime() < today.getTime());

        /**
         * Only non-expired quantity can be sold.
         */
        if (!isExpired) {
          availableQuantity += remainingQuantity;
        }

        const hasExpiryAlert =
          batch.expiryDate !== null &&
          batch.expiryDate.getTime() <= expiryAlertLimit.getTime();

        if (hasExpiryAlert && batch.expiryDate) {
          expiryAlertQuantity += remainingQuantity;

          if (
            earliestExpiryDate === null ||
            batch.expiryDate.getTime() < earliestExpiryDate.getTime()
          ) {
            earliestExpiryDate = batch.expiryDate;
          }
        }
      }

      /**
       * Zero stock and low stock use the same UI type.
       */
      const stockAlertThreshold =
        pharmacyDrug.minStockAlert !== null
          ? pharmacyDrug.minStockAlert * unitsPerBox
          : null;

      const hasStockAlert =
        availableQuantity === 0 ||
        (stockAlertThreshold !== null &&
          availableQuantity <= stockAlertThreshold);
      

      if (hasStockAlert) {
        alerts.push({
          pharmacyDrugId: pharmacyDrug.pharmacyDrugId,

          drugName,

          alertType: 'STOCK_ALERT',

          quantity: this.toDisplayQuantity(availableQuantity, unitsPerBox),

          expiryDate: null,
        });
      }

      /**
       * Expired and near-expiry batches use the same UI type.
       */
      if (expiryAlertQuantity > 0) {
        alerts.push({
          pharmacyDrugId: pharmacyDrug.pharmacyDrugId,

          drugName,

          alertType: 'EXPIRY_ALERT',

          quantity: this.toDisplayQuantity(expiryAlertQuantity, unitsPerBox),

          expiryDate: earliestExpiryDate,
        });
      }
    }

    return alerts;
  }

  /**
   * Convert base units to full boxes and loose units.
   *
   * Example:
   * 53 units / 20 unitsPerBox
   * => 2 boxes + 13 units.
   */
  private toDisplayQuantity(
    totalUnits: number,
    unitsPerBox: number,
  ): AlertQuantity {
    const safeUnitsPerBox = unitsPerBox > 0 ? unitsPerBox : 1;

    return {
      // totalUnits,

      fullBoxes: Math.floor(totalUnits / safeUnitsPerBox),

      remainingUnits: totalUnits % safeUnitsPerBox,
    };
  }
}

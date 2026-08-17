import { Injectable, Logger } from '@nestjs/common';

import {
  NotificationRecipientType,
  PharmacyStatus,
} from '../../generated/prisma/enums';

import { PrismaService } from '../../prisma/prisma.service';

import { NotificationUseCase } from '../notification.use-case';

@Injectable()
export class SendPriceListChangeNotificationsUseCase {
  private readonly logger = new Logger(
    SendPriceListChangeNotificationsUseCase.name,
  );

  constructor(
    private readonly prisma: PrismaService,

    private readonly notificationUseCase: NotificationUseCase,
  ) {}

  async execute(generalDrugPriceListId: number): Promise<void> {
    /**
     * نجلب Price List المحددة التي سببت الـ Job.
     *
     * مهم:
     * GeneralDrugPriceListItem يحتوي snapshot
     * للأسعار الجديدة التي تم نشرها.
     */
    const priceList = await this.prisma.generalDrugPriceList.findUnique({
      where: {
        generalDrugPriceListId,
      },

      select: {
        generalDrugPriceListId: true,
        version: true,

        items: {
          select: {
            generalDrugId: true,
            netPrice: true,
            consumerPrice: true,

            generalDrug: {
              select: {
                drugId: true,
                tradeName: true,
              },
            },
          },
        },
      },
    });

    if (!priceList) {
      this.logger.warn(`Price list ${generalDrugPriceListId} not found.`);

      return;
    }

    if (priceList.items.length === 0) {
      return;
    }

    /**
     * المفتاح هنا هو drugId لأن PharmacyDrug
     * مرتبط بالـ Drug وليس generalDrugId مباشرة.
     */
    const priceItemByDrugId = new Map(
      priceList.items.map((item) => [
        item.generalDrug.drugId,
        {
          generalDrugId: item.generalDrugId,

          tradeName: item.generalDrug.tradeName,

          netPrice: Number(item.netPrice),

          consumerPrice: Number(item.consumerPrice),
        },
      ]),
    );

    const changedDrugIds = [...priceItemByDrugId.keys()];

    /**
     * بدل:
     *
     * find all pharmacies
     * ثم status لكل pharmacy
     *
     * نجلب مباشرة PharmacyDrug التي تمتلك
     * واحداً من الأدوية الموجودة في هذه القائمة.
     */
    const pharmacyDrugs = await this.prisma.pharmacyDrug.findMany({
      where: {
        isActive: true,

        drugId: {
          in: changedDrugIds,
        },

        pharmacy: {
          status: PharmacyStatus.ACTIVE,
        },
      },

      select: {
        pharmacyDrugId: true,
        pharmacyId: true,
        drugId: true,

        netPrice: true,
        consumerPrice: true,
      },
    });

    /**
     * pharmacyId -> number of affected drugs
     */
    const affectedCountByPharmacy = new Map<number, number>();

    for (const pharmacyDrug of pharmacyDrugs) {
      const official = priceItemByDrugId.get(pharmacyDrug.drugId);

      if (!official) {
        continue;
      }

      const currentNetPrice = this.decimalToNumber(pharmacyDrug.netPrice);

      const currentConsumerPrice = this.decimalToNumber(
        pharmacyDrug.consumerPrice,
      );

      /**
       * إذا local price = null نعتبر أنه يحتاج تحديث.
       */
      const netPriceChanged =
        currentNetPrice === null ||
        !this.sameMoney(currentNetPrice, official.netPrice);

      const consumerPriceChanged =
        currentConsumerPrice === null ||
        !this.sameMoney(currentConsumerPrice, official.consumerPrice);

      if (!netPriceChanged && !consumerPriceChanged) {
        continue;
      }

      affectedCountByPharmacy.set(
        pharmacyDrug.pharmacyId,

        (affectedCountByPharmacy.get(pharmacyDrug.pharmacyId) ?? 0) + 1,
      );
    }

    /**
     * الآن لدينا فقط الصيدليات المتأثرة.
     */
    const affectedPharmacies = [...affectedCountByPharmacy.entries()];

    if (affectedPharmacies.length === 0) {
      this.logger.log(
        `Price list v${priceList.version}: no pharmacies affected.`,
      );

      return;
    }

    /**
     * لا نعمل Promise.all على آلاف الصيدليات مرة واحدة.
     * نقسمها إلى chunks.
     */
    const chunkSize = 50;

    for (let index = 0; index < affectedPharmacies.length; index += chunkSize) {
      const chunk = affectedPharmacies.slice(index, index + chunkSize);

      await Promise.all(
        chunk.map(async ([pharmacyId, affectedDrugsCount]) => {
          try {
            await this.notificationUseCase.send({
              recipientType: NotificationRecipientType.PHARMACY,

              recipientId: pharmacyId,

              title: 'تحديث أسعار الأدوية',

              body:
                affectedDrugsCount === 1
                  ? 'يوجد دواء واحد في مخزونك تغير سعره الرسمي. يرجى مراجعة تحديثات الأسعار.'
                  : `يوجد ${affectedDrugsCount} أدوية في مخزونك تغيرت أسعارها الرسمية. يرجى مراجعة تحديثات الأسعار.`,
            });
          } catch (error) {
            this.logger.error(
              `Failed to create price-change notification for pharmacyId=${pharmacyId}`,

              error instanceof Error ? error.stack : undefined,
            );
          }
        }),
      );
    }

    this.logger.log(
      `Price list v${priceList.version}: notifications created for ${affectedPharmacies.length} pharmacies.`,
    );
  }

  private decimalToNumber(value: unknown | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    return Number(value);
  }

  private sameMoney(first: number, second: number): boolean {
    return Math.round(first * 100) === Math.round(second * 100);
  }
}

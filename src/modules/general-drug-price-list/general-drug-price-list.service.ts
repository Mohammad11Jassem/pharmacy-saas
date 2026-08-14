import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PublishGeneralDrugPriceListDto } from './dto/publish-general-drug-price-list.dto';

type DbClient = PrismaService | Prisma.TransactionClient;

type PendingPriceChange = {
  pharmacyDrugId: number;
  generalDrugId: number;
  tradeName: string;
  currentNetPrice: number | null;
  newNetPrice: number;
  currentConsumerPrice: number | null;
  newConsumerPrice: number;
  netPriceChanged: boolean;
  consumerPriceChanged: boolean;
};

type PriceListSummary = {
  generalDrugPriceListId: number;
  version: number;
  publishedAt: Date;
};

@Injectable()
export class GeneralDrugPriceListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async publish(dto: PublishGeneralDrugPriceListDto) {
    this.validatePublishDto(dto);

    return this.unitOfWork.executeSerializable(async (tx) => {
      const requestedIds = dto.items.map((item) => item.generalDrugId);

      const generalDrugs = await tx.generalDrug.findMany({
        where: {
          generalDrugId: {
            in: requestedIds,
          },
        },
        select: {
          generalDrugId: true,
          tradeName: true,
          netPrice: true,
          consumerPrice: true,
        },
      });

      if (generalDrugs.length !== requestedIds.length) {
        const foundIds = new Set(
          generalDrugs.map((drug) => drug.generalDrugId),
        );
        const missingIds = requestedIds.filter((id) => !foundIds.has(id));

        throw new NotFoundException(
          `General drugs not found: ${missingIds.join(', ')}`,
        );
      }

      const drugById = new Map(
        generalDrugs.map((drug) => [drug.generalDrugId, drug]),
      );

      const changes = dto.items
        .map((item) => {
          const drug = drugById.get(item.generalDrugId)!;

          const previousNetPrice = Number(drug.netPrice);
          const previousConsumerPrice = Number(drug.consumerPrice);

          const newNetPrice = item.netPrice ?? previousNetPrice;
          const newConsumerPrice =
            item.consumerPrice ?? previousConsumerPrice;

          const netPriceChanged = !this.sameMoney(
            previousNetPrice,
            newNetPrice,
          );
          const consumerPriceChanged = !this.sameMoney(
            previousConsumerPrice,
            newConsumerPrice,
          );

          return {
            generalDrugId: item.generalDrugId,
            tradeName: drug.tradeName,
            previousNetPrice,
            newNetPrice,
            previousConsumerPrice,
            newConsumerPrice,
            netPriceChanged,
            consumerPriceChanged,
          };
        })
        .filter(
          (item) => item.netPriceChanged || item.consumerPriceChanged,
        );

      if (changes.length === 0) {
        throw new BadRequestException('No actual price changes detected');
      }

      const latestVersion = await tx.generalDrugPriceList.aggregate({
        _max: {
          version: true,
        },
      });

      const version = (latestVersion._max.version ?? 0) + 1;

      const priceList = await tx.generalDrugPriceList.create({
        data: {
          version,
          items: {
            create: changes.map((item) => ({
              generalDrugId: item.generalDrugId,
              // Store a complete official-price snapshot for every changed drug.
              netPrice: item.newNetPrice,
              consumerPrice: item.newConsumerPrice,
            })),
          },
        },
        select: {
          generalDrugPriceListId: true,
          version: true,
          publishedAt: true,
        },
      });

      for (const item of changes) {
        await tx.generalDrug.update({
          where: {
            generalDrugId: item.generalDrugId,
          },
          data: {
            netPrice: item.newNetPrice,
            consumerPrice: item.newConsumerPrice,
          },
        });
      }

      return {
        ...priceList,
        itemsCount: changes.length,
        ignoredUnchangedItemsCount: dto.items.length - changes.length,
        items: changes,
      };
    });
  }

  async getStatus(pharmacyId: number) {
    const context = await this.loadPendingContext(this.prisma, pharmacyId);

    if (!context.latestPriceList) {
      return {
        hasNewPriceList: false,
        latestPriceList: null as PriceListSummary | null,
        lastAppliedPriceList: context.lastAppliedPriceList,
        affectedDrugsCount: 0,
      };
    }

    return {
      hasNewPriceList: context.hasNewPriceList,
      latestPriceList: context.latestPriceList,
      lastAppliedPriceList: context.lastAppliedPriceList,
      affectedDrugsCount: context.changes.length,
    };
  }

  async getLatestChanges(pharmacyId: number) {
    const context = await this.loadPendingContext(this.prisma, pharmacyId);

    return {
      hasNewPriceList: context.hasNewPriceList,
      latestPriceList: context.latestPriceList,
      lastAppliedPriceList: context.lastAppliedPriceList,
      affectedDrugsCount: context.changes.length,
      items: context.changes,
    };
  }

  async applyLatest(pharmacyId: number) {
    return this.unitOfWork.executeSerializable(async (tx) => {
      const context = await this.loadPendingContext(tx, pharmacyId);

      if (!context.latestPriceList) {
        return {
          applied: false,
          idempotentReplay: true,
          reason: 'NO_PRICE_LISTS_PUBLISHED',
          appliedPriceList: null as PriceListSummary | null,
          updatedDrugsCount: 0,
          affectedDrugsCount: 0,
        };
      }

      if (!context.hasNewPriceList) {
        return {
          applied: true,
          idempotentReplay: true,
          appliedPriceList: context.latestPriceList,
          updatedDrugsCount: 0,
          affectedDrugsCount: 0,
        };
      }

      for (const change of context.changes) {
        await tx.pharmacyDrug.update({
          where: {
            pharmacyDrugId: change.pharmacyDrugId,
          },
          data: {
            netPrice: change.newNetPrice,
            consumerPrice: change.newConsumerPrice,
          },
        });
      }

      await tx.pharmacy.update({
        where: {
          pharmacyId,
        },
        data: {
          lastAppliedGeneralDrugPriceListId:
            context.latestPriceList.generalDrugPriceListId,
        },
      });

      return {
        applied: true,
        idempotentReplay: false,
        previousAppliedVersion:
          context.lastAppliedPriceList?.version ?? null,
        appliedPriceList: context.latestPriceList,
        updatedDrugsCount: context.changes.length,
        affectedDrugsCount: context.changes.length,
        changedGeneralDrugsSinceLastApply:
          context.changedGeneralDrugsCount,
        ignoredNotOwnedDrugsCount: Math.max(
          0,
          context.changedGeneralDrugsCount - context.ownedChangedDrugsCount,
        ),
      };
    });
  }

  private async loadPendingContext(client: DbClient, pharmacyId: number) {
    const pharmacy = await client.pharmacy.findUnique({
      where: {
        pharmacyId,
      },
      select: {
        pharmacyId: true,
        lastAppliedGeneralDrugPriceList: {
          select: {
            generalDrugPriceListId: true,
            version: true,
            publishedAt: true,
          },
        },
      },
    });

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const latestPriceList = await client.generalDrugPriceList.findFirst({
      orderBy: {
        version: 'desc',
      },
      select: {
        generalDrugPriceListId: true,
        version: true,
        publishedAt: true,
      },
    });

    const lastAppliedPriceList =
      pharmacy.lastAppliedGeneralDrugPriceList ?? null;

    if (!latestPriceList) {
      return {
        latestPriceList: null,
        lastAppliedPriceList,
        hasNewPriceList: false,
        changedGeneralDrugsCount: 0,
        ownedChangedDrugsCount: 0,
        changes: [] as PendingPriceChange[],
      };
    }

    const lastAppliedVersion = lastAppliedPriceList?.version ?? 0;
    const hasNewPriceList = latestPriceList.version > lastAppliedVersion;

    if (!hasNewPriceList) {
      return {
        latestPriceList,
        lastAppliedPriceList,
        hasNewPriceList: false,
        changedGeneralDrugsCount: 0,
        ownedChangedDrugsCount: 0,
        changes: [] as PendingPriceChange[],
      };
    }

    /**
     * A pharmacy may skip versions (for example v5 -> v7).
     * Therefore we collect the union of every general drug changed after the
     * last applied version, not only items from the latest list.
     */
    const pendingPriceItems = await client.generalDrugPriceListItem.findMany({
      where: {
        priceList: {
          version: {
            gt: lastAppliedVersion,
            lte: latestPriceList.version,
          },
        },
      },
      select: {
        generalDrugId: true,
      },
      distinct: ['generalDrugId'],
    });

    const changedGeneralDrugIds = pendingPriceItems.map(
      (item) => item.generalDrugId,
    );

    if (changedGeneralDrugIds.length === 0) {
      return {
        latestPriceList,
        lastAppliedPriceList,
        hasNewPriceList: true,
        changedGeneralDrugsCount: 0,
        ownedChangedDrugsCount: 0,
        changes: [] as PendingPriceChange[],
      };
    }

    const currentOfficialDrugs = await client.generalDrug.findMany({
      where: {
        generalDrugId: {
          in: changedGeneralDrugIds,
        },
      },
      select: {
        generalDrugId: true,
        drugId: true,
        tradeName: true,
        netPrice: true,
        consumerPrice: true,
      },
    });

    const officialByDrugId = new Map(
      currentOfficialDrugs.map((drug) => [drug.drugId, drug]),
    );

    const pharmacyDrugs = await client.pharmacyDrug.findMany({
      where: {
        pharmacyId,
        drugId: {
          in: currentOfficialDrugs.map((drug) => drug.drugId),
        },
      },
      select: {
        pharmacyDrugId: true,
        drugId: true,
        netPrice: true,
        consumerPrice: true,
      },
    });

    const changes: PendingPriceChange[] = [];

    for (const pharmacyDrug of pharmacyDrugs) {
      const official = officialByDrugId.get(pharmacyDrug.drugId);

      if (!official) {
        continue;
      }

      const currentNetPrice = this.decimalToNumber(pharmacyDrug.netPrice);
      const currentConsumerPrice = this.decimalToNumber(
        pharmacyDrug.consumerPrice,
      );
      const newNetPrice = Number(official.netPrice);
      const newConsumerPrice = Number(official.consumerPrice);

      const netPriceChanged =
        currentNetPrice === null ||
        !this.sameMoney(currentNetPrice, newNetPrice);
      const consumerPriceChanged =
        currentConsumerPrice === null ||
        !this.sameMoney(currentConsumerPrice, newConsumerPrice);

      if (!netPriceChanged && !consumerPriceChanged) {
        continue;
      }

      changes.push({
        pharmacyDrugId: pharmacyDrug.pharmacyDrugId,
        generalDrugId: official.generalDrugId,
        tradeName: official.tradeName,
        currentNetPrice,
        newNetPrice,
        currentConsumerPrice,
        newConsumerPrice,
        netPriceChanged,
        consumerPriceChanged,
      });
    }

    return {
      latestPriceList,
      lastAppliedPriceList,
      hasNewPriceList: true,
      changedGeneralDrugsCount: changedGeneralDrugIds.length,
      ownedChangedDrugsCount: pharmacyDrugs.length,
      changes,
    };
  }

  private validatePublishDto(dto: PublishGeneralDrugPriceListDto) {
    const ids = dto.items.map((item) => item.generalDrugId);
    const uniqueIds = new Set(ids);

    if (uniqueIds.size !== ids.length) {
      throw new BadRequestException(
        'Duplicate generalDrugId values are not allowed in one price list',
      );
    }

    for (const item of dto.items) {
      if (item.netPrice === undefined && item.consumerPrice === undefined) {
        throw new BadRequestException(
          `At least one price is required for generalDrugId ${item.generalDrugId}`,
        );
      }
    }
  }

  private decimalToNumber(value: unknown | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    return Number(value);
  }

  private sameMoney(a: number, b: number): boolean {
    return Math.round(a * 100) === Math.round(b * 100);
  }
}

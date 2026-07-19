import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  getPaginationParams,
  toPaginatedResult,
} from '../../../common/pagination/pagination.util';
import { ListDrugAlternativesQueryDto } from '../dto/list-drug-alternatives-query.dto';
import {
  AlternativeCandidate,
  assertAlternativeCompositionCanBeMatched,
  classifyAlternativeMatch,
  compareAlternativeCandidates,
  mapAlternativeCandidateResponse,
  mapAlternativeTargetResponse,
  toUnifiedAlternativeDrugProfile,
} from '../helpers/drug-alternative-matcher.helper';
import {
  pharmacyDrugAlternativeSelect,
  PharmacyDrugAlternativeRecord,
} from '../selects/pharmacy-drug-alternatives.select';

type AvailableStockRow = {
  pharmacyDrugId: number;
  availableBaseQuantity: bigint | number;
};

@Injectable()
export class GetPharmacyDrugAlternativesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    pharmacyId: number,
    pharmacyDrugId: number,
    query: ListDrugAlternativesQueryDto,
  ) {
    const targetRecord = await this.findTargetDrug(pharmacyId, pharmacyDrugId);

    const target = toUnifiedAlternativeDrugProfile(targetRecord);

    assertAlternativeCompositionCanBeMatched(target);

    const candidateRecords = await this.findCandidateDrugs(
      pharmacyId,
      pharmacyDrugId,
      target.ingredients.map((item) => item.ingredientId),
    );

    const classifiedCandidates = candidateRecords
      .map(toUnifiedAlternativeDrugProfile)
      .map((candidate) => {
        const matchType = classifyAlternativeMatch(target, candidate);

        return matchType
          ? {
              ...candidate,
              matchType,
            }
          : null;
      })
      .filter(
        (
          candidate,
        ): candidate is Omit<AlternativeCandidate, 'availableBaseQuantity'> =>
          candidate !== null,
      );

    // const stockByPharmacyDrugId = await this.getAvailableStockByDrug(
    //   pharmacyId,
    //   classifiedCandidates.map((item) => item.pharmacyDrugId),
    // );
    const stockByPharmacyDrugId = await this.getAvailableStockByDrug(
      pharmacyId,
      [
        target.pharmacyDrugId,

        ...classifiedCandidates.map(
          (item) => item.pharmacyDrugId,
        ),
      ],
    );

    const targetAvailableBaseQuantity =
    stockByPharmacyDrugId.get(
      target.pharmacyDrugId,
    ) ?? 0;

    const availableAlternatives: AlternativeCandidate[] = classifiedCandidates
      .map((candidate) => ({
        ...candidate,
        availableBaseQuantity:
          stockByPharmacyDrugId.get(candidate.pharmacyDrugId) ?? 0,
      }))
      .filter((candidate) => candidate.availableBaseQuantity > 0)
      .sort(compareAlternativeCandidates);

    const { page, limit, skip, take } = getPaginationParams(
      query.page,
      query.limit,
    );

    const paginatedAlternatives = availableAlternatives.slice(
      skip,
      skip + take,
    );

    return {
      // targetDrug: mapAlternativeTargetResponse(target),
      targetDrug: mapAlternativeTargetResponse(
        target,
        targetAvailableBaseQuantity,
      ),
      alternatives: toPaginatedResult(
        paginatedAlternatives.map(mapAlternativeCandidateResponse),
        availableAlternatives.length,
        page,
        limit,
      ),
    };
  }

  private async findTargetDrug(
    pharmacyId: number,
    pharmacyDrugId: number,
  ): Promise<PharmacyDrugAlternativeRecord> {
    const target = await this.prisma.pharmacyDrug.findFirst({
      where: {
        pharmacyDrugId,
        pharmacyId,
      },
      select: pharmacyDrugAlternativeSelect,
    });

    if (!target) {
      throw new NotFoundException('Pharmacy drug not found');
    }

    return target;
  }

  private async findCandidateDrugs(
    pharmacyId: number,
    targetPharmacyDrugId: number,
    targetIngredientIds: number[],
  ): Promise<PharmacyDrugAlternativeRecord[]> {
    return this.prisma.pharmacyDrug.findMany({
      where: {
        pharmacyId,
        pharmacyDrugId: {
          not: targetPharmacyDrugId,
        },
        isActive: true,
        OR: [
          {
            drug: {
              generalDrug: {
                is: {
                  isActive: true,
                  ingredients: {
                    some: {
                      ingredientId: {
                        in: targetIngredientIds,
                      },
                    },
                  },
                },
              },
            },
          },
          {
            drug: {
              privateDrug: {
                is: {
                  isActive: true,
                  ingredients: {
                    some: {
                      ingredientId: {
                        in: targetIngredientIds,
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      select: pharmacyDrugAlternativeSelect,
    });
  }

  private async getAvailableStockByDrug(
    pharmacyId: number,
    pharmacyDrugIds: number[],
  ): Promise<Map<number, number>> {
    const uniqueIds = [...new Set(pharmacyDrugIds)];

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.$queryRaw<AvailableStockRow[]>(Prisma.sql`
      SELECT
        b."pharmacy_drug_id" AS "pharmacyDrugId",
        SUM(b."initial_quantity" - b."sold_quantity")::bigint
          AS "availableBaseQuantity"
      FROM "batches" b
      INNER JOIN "pharmacy_drugs" pd
        ON pd."pharmacy_drug_id" = b."pharmacy_drug_id"
      WHERE
        pd."pharmacy_id" = ${pharmacyId}
        AND b."pharmacy_drug_id" IN (${Prisma.join(uniqueIds)})
        AND b."status" = 'ACTIVE'::"BatchStatus"
        AND b."expiry_date" >= CURRENT_DATE
        AND b."initial_quantity" > b."sold_quantity"
      GROUP BY b."pharmacy_drug_id"
    `);

    return new Map(
      rows.map((row) => [
        row.pharmacyDrugId,
        Number(row.availableBaseQuantity),
      ]),
    );
  }
}

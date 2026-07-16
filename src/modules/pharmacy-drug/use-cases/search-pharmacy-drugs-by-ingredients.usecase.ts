import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  buildPaginationMeta,
  getPaginationParams,
} from '../../../common/pagination/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { SearchPharmacyDrugsByIngredientsDto } from '../dto/search-pharmacy-drugs-by-ingredients.dto';
import { IngredientSetMatchType } from '../enums/ingredient-set-match-type.enum';
import {
  classifyIngredientSetMatch,
  getIngredientSetMatchRank,
} from '../helpers/ingredient-set-matcher.helper';
import { decimalToNumber } from '../helpers/pharmacy-drug-function.helper';
import {
  SearchPharmacyDrugsByIngredientsPayload,
  searchPharmacyDrugsByIngredientsSelect,
} from '../selects/search-pharmacy-drugs-by-ingredients.select';

type SellableStockRow = {
  pharmacyDrugId: number;
  availableBaseQuantity: number;
};

type IngredientSearchResultItem = {
  pharmacyDrugId: number;
  drugId: number;
  tradeName: string;
  barcode: string;
  source: SearchPharmacyDrugsByIngredientsPayload['drug']['source'];
  matchType: IngredientSetMatchType;
  dosageForm: {
    dosageFormId: number;
    dosageFormName: string;
    formCategory: string;
  };
  ingredients: Array<{
    ingredientId: number;
    ingredientName: string;
    strengthValue: number | null;
    unit: string | null;
  }>;
  unitsPerBox: number;
  sellPart: boolean;
  netPrice: number | null;
  consumerPrice: number | null;
  stock: {
    availableBaseQuantity: number;
    availableFullBoxes: number;
    isAvailable: boolean;
  };
};

@Injectable()
export class SearchPharmacyDrugsByIngredientsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, dto: SearchPharmacyDrugsByIngredientsDto) {
    const selectedIngredientIds = [...new Set(dto.ingredientIds)].sort(
      (left, right) => left - right,
    );

    const selectedIngredients = await this.findSelectedIngredientsOrThrow(
      selectedIngredientIds,
    );

    const candidates = await this.findCandidateDrugs(
      pharmacyId,
      selectedIngredientIds,
      dto.dosageFormId,
    );

    const stockByPharmacyDrugId = await this.getSellableStockByPharmacyDrugId(
      candidates.map((candidate) => candidate.pharmacyDrugId),
    );

    const matchedItems = candidates
      .map((candidate) =>
        this.mapCandidate(
          candidate,
          selectedIngredientIds,
          stockByPharmacyDrugId.get(candidate.pharmacyDrugId) ?? 0,
        ),
      )
      .filter(
        (item): item is IngredientSearchResultItem =>
          item !== null && (!dto.availableOnly || item.stock.isAvailable),
      )
      .sort((left, right) => this.compareResults(left, right));

    const { page, limit, skip } = getPaginationParams(dto.page, dto.limit);
    const paginatedItems = matchedItems.slice(skip, skip + limit);

    return {
      criteria: {
        ingredients: selectedIngredients,
        dosageFormId: dto.dosageFormId ?? null,
        availableOnly: dto.availableOnly,
      },
      items: paginatedItems,
      meta: buildPaginationMeta(page, limit, matchedItems.length),
    };
  }

  private async findSelectedIngredientsOrThrow(ingredientIds: number[]) {
    const ingredients = await this.prisma.activeIngredient.findMany({
      where: {
        ingredientId: {
          in: ingredientIds,
        },
      },
      select: {
        ingredientId: true,
        ingredientName: true,
      },
    });

    if (ingredients.length !== ingredientIds.length) {
      const existingIds = new Set(
        ingredients.map((ingredient) => ingredient.ingredientId),
      );
      const invalidIds = ingredientIds.filter((id) => !existingIds.has(id));

      throw new BadRequestException(
        `Invalid ingredientId values: ${invalidIds.join(', ')}`,
      );
    }

    const ingredientById = new Map(
      ingredients.map((ingredient) => [ingredient.ingredientId, ingredient]),
    );

    return ingredientIds.map((ingredientId) => {
      const ingredient = ingredientById.get(ingredientId);

      if (!ingredient) {
        throw new BadRequestException(
          `Invalid ingredientId value: ${ingredientId}`,
        );
      }

      return ingredient;
    });
  }

  private findCandidateDrugs(
    pharmacyId: number,
    ingredientIds: number[],
    dosageFormId?: number,
  ) {
    const activeDrugCondition: Prisma.PharmacyDrugWhereInput = {
      OR: [
        {
          drug: {
            generalDrug: {
              is: {
                isActive: true,
                ...(dosageFormId ? { dosageFormId } : {}),
              },
            },
          },
        },
        {
          drug: {
            privateDrug: {
              is: {
                isActive: true,
                ...(dosageFormId ? { dosageFormId } : {}),
              },
            },
          },
        },
      ],
    };

    const ingredientConditions: Prisma.PharmacyDrugWhereInput[] =
      ingredientIds.map((ingredientId) => ({
        OR: [
          {
            drug: {
              generalDrug: {
                is: {
                  ingredients: {
                    some: {
                      ingredientId,
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
                  ingredients: {
                    some: {
                      ingredientId,
                    },
                  },
                },
              },
            },
          },
        ],
      }));

    const where: Prisma.PharmacyDrugWhereInput = {
      pharmacyId,
      isActive: true,
      AND: [activeDrugCondition, ...ingredientConditions],
    };

    return this.prisma.pharmacyDrug.findMany({
      where,
      select: searchPharmacyDrugsByIngredientsSelect,
    });
  }

  private async getSellableStockByPharmacyDrugId(
    pharmacyDrugIds: number[],
  ): Promise<Map<number, number>> {
    const uniqueIds = [...new Set(pharmacyDrugIds)].sort(
      (left, right) => left - right,
    );

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.$queryRaw<SellableStockRow[]>(Prisma.sql`
      SELECT
        b."pharmacy_drug_id" AS "pharmacyDrugId",
        SUM(b."initial_quantity" - b."sold_quantity")::int
          AS "availableBaseQuantity"
      FROM "batches" b
      WHERE
        b."pharmacy_drug_id" IN (${Prisma.join(uniqueIds)})
        AND b."status" = 'ACTIVE'::"BatchStatus"
        AND b."expiry_date" >= CURRENT_DATE
        AND b."initial_quantity" > b."sold_quantity"
      GROUP BY b."pharmacy_drug_id"
    `);

    return new Map(
      rows.map((row) => [row.pharmacyDrugId, row.availableBaseQuantity]),
    );
  }

  private mapCandidate(
    candidate: SearchPharmacyDrugsByIngredientsPayload,
    selectedIngredientIds: number[],
    availableBaseQuantity: number,
  ): IngredientSearchResultItem | null {
    const drugInfo = candidate.drug.generalDrug ?? candidate.drug.privateDrug;

    if (!drugInfo) {
      return null;
    }

    const ingredients = drugInfo.ingredients.map((item) => ({
      ingredientId: item.ingredient.ingredientId,
      ingredientName: item.ingredient.ingredientName,
      strengthValue: decimalToNumber(item.strengthValue),
      unit: item.unit,
    }));

    const matchType = classifyIngredientSetMatch(
      selectedIngredientIds,
      ingredients.map((ingredient) => ingredient.ingredientId),
    );

    if (!matchType) {
      return null;
    }

    const unitsPerBox = drugInfo.unitsPerBox;

    return {
      pharmacyDrugId: candidate.pharmacyDrugId,
      drugId: candidate.drugId,
      tradeName: drugInfo.tradeName,
      barcode: drugInfo.barcode,
      source: candidate.drug.source,
      matchType,
      dosageForm: drugInfo.dosageForm,
      ingredients,
      unitsPerBox,
      sellPart: candidate.sellPart,
      netPrice: decimalToNumber(
        candidate.netPrice ?? candidate.drug.generalDrug?.netPrice,
      ),
      consumerPrice: decimalToNumber(
        candidate.consumerPrice ?? candidate.drug.generalDrug?.consumerPrice,
      ),
      stock: {
        availableBaseQuantity,
        availableFullBoxes:
          unitsPerBox > 0 ? Math.floor(availableBaseQuantity / unitsPerBox) : 0,
        isAvailable: availableBaseQuantity > 0,
      },
    };
  }

  private compareResults(
    left: IngredientSearchResultItem,
    right: IngredientSearchResultItem,
  ): number {
    const matchRankDifference =
      getIngredientSetMatchRank(left.matchType) -
      getIngredientSetMatchRank(right.matchType);

    if (matchRankDifference !== 0) {
      return matchRankDifference;
    }

    if (
      left.stock.availableBaseQuantity !== right.stock.availableBaseQuantity
    ) {
      return (
        right.stock.availableBaseQuantity - left.stock.availableBaseQuantity
      );
    }

    return left.tradeName.localeCompare(right.tradeName);
  }
}

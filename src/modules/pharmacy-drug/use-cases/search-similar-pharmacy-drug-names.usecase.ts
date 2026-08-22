import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SearchSimilarPharmacyDrugNamesDto } from '../dto/search-similar-pharmacy-drug-names.dto';
import {
  calculateDrugNameSimilarity,
  normalizeDrugName,
} from '../helpers/drug-name-similarity.helper';

const MIN_SIMILARITY = 0.7;

@Injectable()
export class SearchSimilarPharmacyDrugNamesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    pharmacyId: number,
    dto: SearchSimilarPharmacyDrugNamesDto,
  ) {
    const searchedName = dto.name.trim();
    const normalizedSearchedName = normalizeDrugName(searchedName);
    const limit = dto.limit ?? 10;

    const pharmacyDrugs = await this.prisma.pharmacyDrug.findMany({
      where: {
        pharmacyId,
      },
      select: {
        pharmacyDrugId: true,
        drug: {
          select: {
            generalDrug: {
              select: {
                tradeName: true,
              },
            },
            privateDrug: {
              select: {
                tradeName: true,
              },
            },
          },
        },
      },
    });

    return pharmacyDrugs
      .map((pharmacyDrug) => {
        const tradeName =
          pharmacyDrug.drug.generalDrug?.tradeName ??
          pharmacyDrug.drug.privateDrug?.tradeName ??
          null;

        if (!tradeName) {
          return null;
        }

        const normalizedTradeName = normalizeDrugName(tradeName);

        if (normalizedTradeName === normalizedSearchedName) {
          return null;
        }

        return {
          pharmacyDrugId: pharmacyDrug.pharmacyDrugId,
          tradeName,
          similarity: calculateDrugNameSimilarity(searchedName, tradeName),
        };
      })
      .filter(
        (
          item,
        ): item is {
          pharmacyDrugId: number;
          tradeName: string;
          similarity: number;
        } => item !== null && item.similarity >= MIN_SIMILARITY,
      )
      .sort((first, second) => second.similarity - first.similarity)
      .slice(0, limit)
      .map(({ pharmacyDrugId, tradeName }) => ({
        pharmacyDrugId,
        tradeName,
      }));
  }
}

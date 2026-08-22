import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';

import { SearchSimilarPharmacyDrugNamesDto } from '../dto/search-similar-pharmacy-drug-names.dto';

import {
  calculateDrugNameSimilarity,
  normalizeDrugName,
} from '../helpers/drug-name-similarity.helper';

/**
 * الحد النهائي للتشابه.
 *
 * هذا خاص بـ:
 * Jaro-Winkler + Normalized Levenshtein

 */
const MIN_SIMILARITY = 0.7;

/**
 * أقل عدد candidates نجلبه من PostgreSQL.
 */
const MIN_CANDIDATES = 30;

/**
 * حتى لا نجلب عددًا ضخمًا مهما كانت قيمة limit.
 */
const MAX_CANDIDATES = 100;

type SimilarDrugCandidateRow = {
  pharmacyDrugId: number;

  tradeName: string;

  /**
   * pg_trgm distance
   *
   * 0 = نفس النص تقريباً
   * كلما زادت القيمة أصبح الاسم أبعد.
   *
   * نستخدمها فقط لاختيار candidates.
   */
  trigramDistance: number;
};

@Injectable()
export class SearchSimilarPharmacyDrugNamesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, dto: SearchSimilarPharmacyDrugNamesDto) {
    const searchedName = dto.name.trim();

    const normalizedSearchedName = normalizeDrugName(searchedName);

    /**
     * عدد النتائج النهائية المطلوبة.
     */
    const limit = dto.limit ?? 10;

    /**
     * لا نريد فقط 10 candidates،
     * لأن pg_trgm ليس الـ algorithm النهائي.
     *
     * لذلك إذا كنا نريد 10 نتائج:
     *
     * 10 × 5 = 50 candidate
     *
     * ثم Jaro-Winkler + Levenshtein
     * يقررون أيها فعلاً مشابه.
     */
    const candidateLimit = Math.min(
      MAX_CANDIDATES,

      Math.max(MIN_CANDIDATES, limit * 5),
    );

    /**
     * المرحلة الأولى:
     *
     * PostgreSQL يبحث باستخدام pg_trgm.
     *
     * لا نجلب كل أدوية الصيدلية.
     *
     * نجلب فقط أقرب مجموعة أسماء.
     */
    const candidates = await this.prisma.$queryRaw<
      SimilarDrugCandidateRow[]
    >(Prisma.sql`

  WITH general_candidates AS (

    SELECT
      pd."pharmacy_drug_id" AS "pharmacyDrugId",

      gd."trade_name" AS "tradeName",

      (
        gd."trade_name"
        <->
        ${searchedName}
      ) AS "trigramDistance"

    FROM "pharmacy_drugs" pd

    INNER JOIN "general_drugs" gd
      ON gd."drug_id" = pd."drug_id"

    WHERE
      pd."pharmacy_id" = ${pharmacyId}

      AND LOWER(gd."trade_name")
          <> LOWER(${searchedName})

    ORDER BY
      gd."trade_name"
      <->
      ${searchedName}

    LIMIT ${candidateLimit}
  ),

  private_candidates AS (

    SELECT
      pd."pharmacy_drug_id" AS "pharmacyDrugId",

      prd."tradeName" AS "tradeName",

      (
        prd."tradeName"
        <->
        ${searchedName}
      ) AS "trigramDistance"

    FROM "pharmacy_drugs" pd

    INNER JOIN "private_drugs" prd
      ON prd."drug_id" = pd."drug_id"

    WHERE
      pd."pharmacy_id" = ${pharmacyId}

      AND LOWER(prd."tradeName")
          <> LOWER(${searchedName})

    ORDER BY
      prd."tradeName"
      <->
      ${searchedName}

    LIMIT ${candidateLimit}
  )

  SELECT
    candidates."pharmacyDrugId",

    candidates."tradeName",

    candidates."trigramDistance"

  FROM (

    SELECT *
    FROM general_candidates

    UNION ALL

    SELECT *
    FROM private_candidates

  ) candidates

  ORDER BY
    candidates."trigramDistance" ASC

  LIMIT ${candidateLimit}

`);
    /**
     * المرحلة الثانية:
     *
     * الآن فقط نطبق الخوارزمية الدقيقة.
     *
     * مثلاً بدل 10,000 اسم،
     * أصبح عندنا 50 اسم فقط.
     */
    return (
      candidates
        .map((candidate) => {
          const similarity = calculateDrugNameSimilarity(
            searchedName,
            candidate.tradeName,
          );

          return {
            pharmacyDrugId: candidate.pharmacyDrugId,

            tradeName: candidate.tradeName,

            similarity,
          };
        })

        /**
         * نطبق الـ final threshold.
         */
        .filter((candidate) => candidate.similarity >= MIN_SIMILARITY)

        /**
         * الآن الترتيب حسب:
         *
         * Jaro-Winkler
         * +
         * Levenshtein
         *
         * وليس حسب pg_trgm.
         */
        .sort((first, second) => second.similarity - first.similarity)

        /**
         * النتائج النهائية.
         */
        .slice(0, limit)

        /**
         * لا نرجع similarity للـ frontend.
         */
        .map(({ pharmacyDrugId, tradeName }) => ({
          pharmacyDrugId,
          tradeName,
        }))
    );
  }
}

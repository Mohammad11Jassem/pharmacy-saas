import { Injectable, Logger } from '@nestjs/common';

import { BatchStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ExpireBatchesUseCase {
  private readonly logger = new Logger(ExpireBatchesUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(cutoffDate: string) {
    const today = this.parseDateOnly(cutoffDate);

    /**
     * لا نجلب أي Batch إلى NestJS.
     *
     * PostgreSQL يقوم مباشرة بتحديث
     * الدفعات التي تحقق الشروط.
     */
    const result = await this.prisma.batch.updateMany({
      where: {
        /**
         * نهتم فقط بالدفعات التي ما زالت ACTIVE.
         *
         * لا داعي لفحص EXPIRED مرة ثانية،
         * ولا DEPLETED.
         */
        status: BatchStatus.ACTIVE,

        /**
         * expiryDate = اليوم
         * تبقى صالحة اليوم.
         *
         * expiryDate < اليوم
         * تصبح EXPIRED.
         */
        expiryDate: {
          lt: today,
        },

        /**
         * يجب أن يكون لدى الدفعة كمية متبقية.
         *
         * remaining =
         * initialQuantity - soldQuantity
         *
         * لذلك:
         *
         * initialQuantity > soldQuantity
         */
        initialQuantity: {
          gt: this.prisma.batch.fields.soldQuantity,
        },
      },

      data: {
        status: BatchStatus.EXPIRED,
      },
    });

    this.logger.log(
      `${result.count} batches marked as EXPIRED. cutoffDate=${cutoffDate}`,
    );

    return {
      expiredBatchesCount: result.count,
      cutoffDate,
    };
  }

  /**
   * تحويل YYYY-MM-DD إلى Date يناسب @db.Date.
   */
  private parseDateOnly(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(`Invalid cutoffDate: ${value}`);
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid cutoffDate: ${value}`);
    }

    return date;
  }
}

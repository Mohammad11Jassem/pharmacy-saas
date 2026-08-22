import { Injectable, Logger } from '@nestjs/common';

import { DimensionLoader } from './dimension.loader';
import { FactLoader } from './fact.loader';

@Injectable()
export class AnalyticsEtlService {
  private readonly logger = new Logger(AnalyticsEtlService.name);

  constructor(
    private readonly dimensionLoader: DimensionLoader,
    private readonly factLoader: FactLoader,
  ) {}

  async execute() {
    this.logger.log('Analytics ETL started');

    try {
      /*
       * الـ Dimensions لا نحذفها.
       *
       * فقط:
       * - إضافة الجديد
       * - تحديث الموجود
       */
      await this.dimensionLoader.load();

      /*
       * تحميل بيانات يوم أمس فقط.
       */
      await this.factLoader.loadYesterday();

      this.logger.log('Analytics ETL completed successfully');
    } catch (error) {
      this.logger.error(
        'Analytics ETL failed',
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }
}

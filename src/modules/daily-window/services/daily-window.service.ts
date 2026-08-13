import { Injectable } from '@nestjs/common';

import { EnsureOwnerPharmacyAccessUseCase } from '../../../common/use-cases/ensure-owner-pharmacy-access.use-case';

import { GetDailyAlertCountUseCase } from '../use-cases/get-daily-alert-count.use-case';
import { GetDailyGrossProfitUseCase } from '../use-cases/get-daily-gross-profit.use-case';
import { GetDailyGrossSalesUseCase } from '../use-cases/get-daily-gross-sales.use-case';
import { GetDailyInvoiceCountUseCase } from '../use-cases/get-daily-invoice-count.use-case';
import { GetIncomingAlertsUseCase } from '../use-cases/get-incoming-alerts.use-case';
import { GetInvoiceActivitiesUseCase } from '../../invoice-activity/use-cases/get-invoice-activities.use-case';

@Injectable()
export class DailyWindowService {
  constructor(
    private readonly ensureOwnerPharmacyAccess: EnsureOwnerPharmacyAccessUseCase,

    private readonly getDailyAlertCount: GetDailyAlertCountUseCase,

    private readonly getDailyInvoiceCount: GetDailyInvoiceCountUseCase,

    private readonly getDailyGrossSales: GetDailyGrossSalesUseCase,

    private readonly getDailyGrossProfit: GetDailyGrossProfitUseCase,

    private readonly getIncomingAlerts: GetIncomingAlertsUseCase,
    // private readonly getInvoiceActivities: GetInvoiceActivitiesUseCase,
  ) {}

  async getCards(ownerUserId: number, pharmacyId: number, date: string) {
    await this.ensureOwnerPharmacyAccess.execute(ownerUserId, pharmacyId);

    const [nearExpiry, invoices, grossSales, grossProfit] = await Promise.all([
      this.getDailyAlertCount.execute(pharmacyId),

      this.getDailyInvoiceCount.execute(pharmacyId, date),

      this.getDailyGrossSales.execute(pharmacyId, date),

      this.getDailyGrossProfit.execute(pharmacyId, date),
    ]);

    return {
      date,

      cards: {
        nearExpiry,
        invoices,
        grossSales,
        grossProfit,
      },
    };
  }

  async getAlerts(
    ownerUserId: number,
    pharmacyId: number,
    page: number,
    limit: number,
  ) {
    await this.ensureOwnerPharmacyAccess.execute(ownerUserId, pharmacyId);

    return this.getIncomingAlerts.execute(pharmacyId, page, limit);
  }

  // async getActivities(
  //   ownerUserId: number,
  //   pharmacyId: number,
  //   date: string,
  //   page: number,
  //   limit: number,
  // ) {
  //   await this.ensureOwnerPharmacyAccess.execute(ownerUserId, pharmacyId);

  //   return this.getInvoiceActivities.execute(pharmacyId, date, page, limit);
  // }
}

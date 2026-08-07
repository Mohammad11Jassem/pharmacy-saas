import { Injectable } from '@nestjs/common';

import { GetDailyAlertCountUseCase } from '../use-cases/get-daily-alert-count.use-case';
import { GetDailyGrossProfitUseCase } from '../use-cases/get-daily-gross-profit.use-case';
import { GetDailyGrossSalesUseCase } from '../use-cases/get-daily-gross-sales.use-case';
import { GetDailyInvoiceCountUseCase } from '../use-cases/get-daily-invoice-count.use-case';
import { GetIncomingAlertsUseCase } from '../use-cases/get-incoming-alerts.use-case';
// import { GetInvoiceActivitiesUseCase } from '../use-cases/get-invoice-activities.use-case';

@Injectable()
export class DailyWindowService {
  constructor(
    private readonly getDailyAlertCount:
      GetDailyAlertCountUseCase,

    private readonly getDailyInvoiceCount:
      GetDailyInvoiceCountUseCase,

    private readonly getDailyGrossSales:
      GetDailyGrossSalesUseCase,

    private readonly getDailyGrossProfit:
      GetDailyGrossProfitUseCase,

    private readonly getIncomingAlerts:
      GetIncomingAlertsUseCase,

    // private readonly getInvoiceActivities:
    //   GetInvoiceActivitiesUseCase,
  ) {}

  async getCards(
    pharmacyId: number,
    date: string,
  ) {
    const [
      nearExpiry,
      invoices,
      grossSales,
      grossProfit,
    ] = await Promise.all([
      this.getDailyAlertCount.execute(
        pharmacyId,
      ),

      this.getDailyInvoiceCount.execute(
        pharmacyId,
        date,
      ),

      this.getDailyGrossSales.execute(
        pharmacyId,
        date,
      ),

      this.getDailyGrossProfit.execute(
        pharmacyId,
        date,
      ),
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

  getAlerts(
    pharmacyId: number,
    page: number,
    limit: number,
  ) {
    return this.getIncomingAlerts.execute(
      pharmacyId,
      page,
      limit,
    );
  }

//   getActivities(
//     pharmacyId: number,
//     date: string,
//     page: number,
//     limit: number,
//   ) {
//     return this.getInvoiceActivities.execute(
//       pharmacyId,
//       date,
//       page,
//       limit,
//     );
//   }
}
import { Injectable } from '@nestjs/common';

import { CurrentInventoryAlertsService } from '../services/current-inventory-alerts.service';

@Injectable()
export class GetDailyAlertCountUseCase {
  constructor(
    private readonly alertsService:
      CurrentInventoryAlertsService,
  ) {}

  async execute(pharmacyId: number) {
    /**
     * The count uses the same logic as the alerts list.
     */
    const alerts =
      await this.alertsService.getAll(
        pharmacyId,
      );

    return {
      count: alerts.length,
    };
  }
}
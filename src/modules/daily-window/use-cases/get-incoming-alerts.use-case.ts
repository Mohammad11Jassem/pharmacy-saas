import { Injectable } from '@nestjs/common';

import { CurrentInventoryAlertsService } from '../services/current-inventory-alerts.service';

@Injectable()
export class GetIncomingAlertsUseCase {
  constructor(
    private readonly alertsService:
      CurrentInventoryAlertsService,
  ) {}

  async execute(
    pharmacyId: number,
    page: number,
    limit: number,
  ) {
    const alerts =
      await this.alertsService.getAll(
        pharmacyId,
      );

    const totalItems = alerts.length;

    const skip =
      (page - 1) * limit;

    const items = alerts.slice(
      skip,
      skip + limit,
    );

    return {
      items,

      meta: {
        page,
        limit,
        totalItems,

        totalPages:
          Math.ceil(totalItems / limit),
      },
    };
  }
}
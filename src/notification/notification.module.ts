import { Module } from '@nestjs/common';

import { BullModule } from '@nestjs/bullmq';

import { NotificationController } from './notification.controller';

import { NotificationService } from './notification.service';

import { NotificationUseCase } from './notification.use-case';

import { NotificationProcessor } from './notification.processor';

import { NOTIFICATION_QUEUE } from './notification.queue';
import { SendLowStockNotificationsAfterSaleUseCase } from './use-cases/send-low-stock-notifications-after-sale.usecase';
import { SendPriceListChangeNotificationsUseCase } from './use-cases/send-price-list-change-notifications.usecase';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
  ],

  controllers: [NotificationController],

  providers: [
    NotificationService,
    NotificationUseCase,
    NotificationProcessor,
    SendLowStockNotificationsAfterSaleUseCase,
    SendPriceListChangeNotificationsUseCase,
  ],

  exports: [
    
    NotificationUseCase,
    SendLowStockNotificationsAfterSaleUseCase,
    SendPriceListChangeNotificationsUseCase,
  ],
})
export class NotificationModule {}

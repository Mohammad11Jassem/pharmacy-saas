import { Module } from '@nestjs/common';

import { BullModule } from '@nestjs/bullmq';

import { NotificationController } from './notification.controller';

import { NotificationService } from './notification.service';

import { NotificationUseCase } from './notification.use-case';

import { NotificationProcessor } from './notification.processor';

import { NOTIFICATION_QUEUE } from './notification.queue';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
  ],

  controllers: [NotificationController],

  providers: [NotificationService, NotificationUseCase, NotificationProcessor],

  exports: [
    // Other modules need this to send notifications.
    NotificationUseCase,
  ],
})
export class NotificationModule {}

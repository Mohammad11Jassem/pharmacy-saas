import { Injectable } from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { NotificationService } from './notification.service';

import {
  NOTIFICATION_QUEUE,
  PRICE_LIST_CHANGED_JOB,
  SEND_NOTIFICATION_JOB,
} from './notification.queue';
import { NotificationRecipientType } from '../generated/prisma/enums';

@Injectable()
export class NotificationUseCase {
  constructor(
    private readonly notificationService: NotificationService,

    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  async send(data: {
    title: string;
    body: string;
    recipientType: NotificationRecipientType;
    recipientId: number;
  }) {
    // Save notification first.
    const notification = await this.notificationService.create(data);

    // Add notification to background queue.
    await this.notificationQueue.add(
      SEND_NOTIFICATION_JOB,
      {
        notificationId: notification.notificationId,
      },
      {
        attempts: 3,

        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      },
    );

    return notification;
  }

  async enqueuePriceListChanged(generalDrugPriceListId: number) {
    await this.notificationQueue.add(
      PRICE_LIST_CHANGED_JOB,

      {
        generalDrugPriceListId,
      },

      {
        /**
         * يمنع إدخال نفس Price List
         * كـ Job مرتين ما دام الـ Job موجوداً.
         */
        jobId: `price-list-notifications-${generalDrugPriceListId}`,

        attempts: 3,

        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      },
    );
  }
}

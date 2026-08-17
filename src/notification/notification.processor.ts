import { Logger } from '@nestjs/common';

import { Processor, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { getMessaging } from 'firebase-admin/messaging';

import { NotificationService } from './notification.service';

import {
  NOTIFICATION_QUEUE,
  PRICE_LIST_CHANGED_JOB,
  SEND_NOTIFICATION_JOB,
} from './notification.queue';
import { SendPriceListChangeNotificationsUseCase } from './use-cases/send-price-list-change-notifications.usecase';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly sendPriceListChangeNotificationsUseCase: SendPriceListChangeNotificationsUseCase,
  ) {
    super();
  }

  // async process(
  //   job: Job<{
  //     notificationId: number;
  //   }>,
  // ) {
  //   // Ignore unknown jobs.
  //   if (job.name !== SEND_NOTIFICATION_JOB) {
  //     return;
  //   }

  //   // Get notification from database.
  //   const notification = await this.notificationService.findById(
  //     job.data.notificationId,
  //   );

  //   if (!notification) {
  //     return;
  //   }

  //   // Get the recipient FCM token.
  //   const fcmToken = await this.notificationService.getFcmToken(
  //     notification.recipientType,
  //     notification.recipientId,
  //   );

  //   // Keep notification in database
  //   // even if the user has no FCM token.
  //   if (!fcmToken) {
  //     this.logger.warn(
  //       `No FCM token for notification ${notification.notificationId}`,
  //     );

  //     return;
  //   }

  //   // Send notification using Firebase.
  //   await getMessaging().send({
  //     token: fcmToken,

  //     notification: {
  //       title: notification.title,
  //       body: notification.body,
  //     },
  //   });

  //   this.logger.log(
  //     `Notification ${notification.notificationId} sent successfully`,
  //   );
  // }
  async process(job: Job) {
    switch (job.name) {
      case SEND_NOTIFICATION_JOB:
        return this.processSendNotification(
          job as Job<{
            notificationId: number;
          }>,
        );

      case PRICE_LIST_CHANGED_JOB:
        return this.processPriceListChanged(
          job as Job<{
            generalDrugPriceListId: number;
          }>,
        );

      default:
        this.logger.warn(`Unknown notification job: ${job.name}`);

        return;
    }
  }

  private async processSendNotification(
    job: Job<{
      notificationId: number;
    }>,
  ) {
    const notification = await this.notificationService.findById(
      job.data.notificationId,
    );

    if (!notification) {
      return;
    }

    const fcmToken = await this.notificationService.getFcmToken(
      notification.recipientType,
      notification.recipientId,
    );

    if (!fcmToken) {
      this.logger.warn(
        `No FCM token for notification ${notification.notificationId}`,
      );

      return;
    }

    await getMessaging().send({
      token: fcmToken,

      notification: {
        title: notification.title,
        body: notification.body,
      },
    });

    this.logger.log(
      `Notification ${notification.notificationId} sent successfully`,
    );
  }

  private async processPriceListChanged(
    job: Job<{
      generalDrugPriceListId: number;
    }>,
  ) {
    await this.sendPriceListChangeNotificationsUseCase.execute(
      job.data.generalDrugPriceListId,
    );
  }
}

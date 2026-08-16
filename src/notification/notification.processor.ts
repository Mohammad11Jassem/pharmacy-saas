import { Logger } from '@nestjs/common';

import {
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { getMessaging } from 'firebase-admin/messaging';

import { NotificationService } from './notification.service';

import {
  NOTIFICATION_QUEUE,
  SEND_NOTIFICATION_JOB,
} from './notification.queue';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor
  extends WorkerHost
{
  private readonly logger =
    new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationService:
      NotificationService,
  ) {
    super();
  }

  async process(
    job: Job<{
      notificationId: number;
    }>,
  ) {
    // Ignore unknown jobs.
    if (
      job.name !== SEND_NOTIFICATION_JOB
    ) {
      return;
    }

    // Get notification from database.
    const notification =
      await this.notificationService.findById(
        job.data.notificationId,
      );

    if (!notification) {
      return;
    }

    // Get the recipient FCM token.
    const fcmToken =
      await this.notificationService.getFcmToken(
        notification.recipientType,
        notification.recipientId,
      );

    // Keep notification in database
    // even if the user has no FCM token.
    if (!fcmToken) {
      this.logger.warn(
        `No FCM token for notification ${notification.notificationId}`,
      );

      return;
    }

    // Send notification using Firebase.
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
}
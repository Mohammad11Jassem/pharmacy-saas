import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { Prisma } from '../../../generated/prisma/client.js';
import {
  OutboxEventStatus,
  RagRequestStatus,
} from '../../../generated/prisma/enums.js';

import { PrismaService } from '../../../prisma/prisma.service.js';

import { ChatAnswerQueueProducer } from '../queues/chat-answer-queue.producer.js';

import {
  CHAT_ANSWER_REQUESTED_EVENT,
  CHAT_OUTBOX_BASE_RETRY_DELAY_MS,
  CHAT_OUTBOX_BATCH_SIZE,
  CHAT_OUTBOX_DISPATCH_INTERVAL_MS,
  CHAT_OUTBOX_LOCK_TIMEOUT_MS,
  CHAT_OUTBOX_MAX_ATTEMPTS,
  CHAT_OUTBOX_MAX_RETRY_DELAY_MS,
} from './chat-outbox.constants.js';

type ClaimedOutboxEvent = {
  outboxEventId: number;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Prisma.JsonValue;
  attempts: number;
};

const QUEUE_PUBLISH_FAILURE_CODE =
  'QUEUE_PUBLISH_FAILED';

@Injectable()
export class ChatOutboxDispatcher {
  private readonly logger = new Logger(
    ChatOutboxDispatcher.name,
  );

  /**
   * يمنع تشغيل دورتين متداخلتين ضمن نسخة التطبيق نفسها.
   * أما بين عدة نسخ من التطبيق فنستخدم SKIP LOCKED.
   */
  private isDispatching = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatAnswerQueueProducer:
      ChatAnswerQueueProducer,
  ) {}

  @Interval(
    'chat-outbox-dispatch',
    CHAT_OUTBOX_DISPATCH_INTERVAL_MS,
  )
  async dispatch(): Promise<void> {
    if (this.isDispatching) {
      return;
    }

    this.isDispatching = true;

    try {
      await this.recoverStaleEvents();

      const events =
        await this.claimPendingEvents();

      for (const event of events) {
        await this.publishEvent(event);
      }
    } catch (error: unknown) {
      this.logger.error(
        'Unexpected chat outbox dispatch error.',
        error instanceof Error
          ? error.stack
          : String(error),
      );
    } finally {
      this.isDispatching = false;
    }
  }

  /**
   * يعيد الأحداث التي ظلت PROCESSING بسبب توقف السيرفر
   * إلى PENDING حتى يعاد نشرها.
   */
  private async recoverStaleEvents(): Promise<void> {
    const staleBefore = new Date(
      Date.now() -
        CHAT_OUTBOX_LOCK_TIMEOUT_MS,
    );

    const result =
      await this.prisma.outboxEvent.updateMany({
        where: {
          status: OutboxEventStatus.PROCESSING,

          lockedAt: {
            lt: staleBefore,
          },
        },

        data: {
          status: OutboxEventStatus.PENDING,
          lockedAt: null,
          availableAt: new Date(),

          lastError:
            'Recovered after outbox lock timeout.',
        },
      });

    if (result.count > 0) {
      this.logger.warn(
        `Recovered ${result.count} stale outbox event(s).`,
      );
    }
  }

  /**
   * يحجز Batch من الأحداث.
   *
   * SKIP LOCKED يسمح لأكثر من نسخة Backend بالعمل
   * دون حجز الحدث نفسه مرتين في الوقت نفسه.
   */
  private async claimPendingEvents(): Promise<
    ClaimedOutboxEvent[]
  > {
    return this.prisma.$queryRaw<
      ClaimedOutboxEvent[]
    >`
      WITH candidates AS (
        SELECT outbox_event_id
        FROM outbox_events
        WHERE status = 'PENDING'
          AND available_at <= NOW()
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${CHAT_OUTBOX_BATCH_SIZE}
      )
      UPDATE outbox_events AS event
      SET
        status = 'PROCESSING',
        locked_at = NOW(),
        attempts = event.attempts + 1,
        updated_at = NOW()
      FROM candidates
      WHERE event.outbox_event_id =
            candidates.outbox_event_id
      RETURNING
        event.outbox_event_id AS "outboxEventId",
        event.aggregate_type AS "aggregateType",
        event.aggregate_id AS "aggregateId",
        event.event_type AS "eventType",
        event.payload AS "payload",
        event.attempts AS "attempts"
    `;
  }

  private async publishEvent(
    event: ClaimedOutboxEvent,
  ): Promise<void> {
    try {
      switch (event.eventType) {
        case CHAT_ANSWER_REQUESTED_EVENT: {
          const ragRequestId =
            this.readRagRequestId(
              event.payload,
            );

          await this.chatAnswerQueueProducer
            .enqueueGenerateAnswer(
              ragRequestId,
            );

          break;
        }

        default:
          throw new Error(
            `Unsupported outbox event type: ${event.eventType}`,
          );
      }

      await this.prisma.outboxEvent.updateMany({
        where: {
          outboxEventId:
            event.outboxEventId,

          status:
            OutboxEventStatus.PROCESSING,
        },

        data: {
          status:
            OutboxEventStatus.PUBLISHED,

          publishedAt: new Date(),
          lockedAt: null,
          lastError: null,
        },
      });

      this.logger.log(
        `Published outbox event ${event.outboxEventId} (${event.eventType}).`,
      );
    } catch (error: unknown) {
      await this.handlePublishFailure(
        event,
        error,
      );
    }
  }

  private async handlePublishFailure(
    event: ClaimedOutboxEvent,
    error: unknown,
  ): Promise<void> {
    const errorMessage =
      this.getErrorMessage(error);

    const reachedMaxAttempts =
      event.attempts >=
      CHAT_OUTBOX_MAX_ATTEMPTS;

    if (reachedMaxAttempts) {
      await this.markPermanentlyFailed(
        event,
        errorMessage,
      );

      return;
    }

    const retryDelay =
      this.calculateRetryDelay(
        event.attempts,
      );

    await this.prisma.outboxEvent.updateMany({
      where: {
        outboxEventId:
          event.outboxEventId,

        status:
          OutboxEventStatus.PROCESSING,
      },

      data: {
        status:
          OutboxEventStatus.PENDING,

        lockedAt: null,

        availableAt: new Date(
          Date.now() + retryDelay,
        ),

        lastError: errorMessage,
      },
    });

    this.logger.warn(
      `Failed to publish outbox event ${event.outboxEventId}. ` +
        `Retrying in ${retryDelay}ms. ` +
        `Error: ${errorMessage}`,
    );
  }

  /**
   * عند نفاد محاولات النشر يجب ألا يبقى RagRequest
   * بحالة PROCESSING إلى الأبد.
   */
  private async markPermanentlyFailed(
    event: ClaimedOutboxEvent,
    errorMessage: string,
  ): Promise<void> {
    const ragRequestId =
      this.readRagRequestId(
        event.payload,
      );

    const finishedAt = new Date();

    await this.prisma.$transaction(
      async (tx) => {
        await tx.outboxEvent.updateMany({
          where: {
            outboxEventId:
              event.outboxEventId,

            status:
              OutboxEventStatus.PROCESSING,
          },

          data: {
            status:
              OutboxEventStatus.FAILED,

            lockedAt: null,
            lastError: errorMessage,
          },
        });

        await tx.ragRequest.updateMany({
          where: {
            ragRequestId,

            status:
              RagRequestStatus.PROCESSING,
          },

          data: {
            status:
              RagRequestStatus.FAILED,

            finishedAt,

            failureCode:
              QUEUE_PUBLISH_FAILURE_CODE,
          },
        });
      },
    );

    this.logger.error(
      `Outbox event ${event.outboxEventId} permanently failed ` +
        `after ${event.attempts} attempts. ` +
        `RagRequest ${ragRequestId} was marked FAILED.`,
    );
  }

  private readRagRequestId(
    payload: Prisma.JsonValue,
  ): number {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload)
    ) {
      throw new Error(
        'Outbox payload must be a JSON object.',
      );
    }

    const objectPayload =
      payload as Record<string, unknown>;

    const ragRequestId =
      objectPayload.ragRequestId;

    if (
      typeof ragRequestId !== 'number' ||
      !Number.isInteger(ragRequestId) ||
      ragRequestId <= 0
    ) {
      throw new Error(
        'Outbox payload contains an invalid ragRequestId.',
      );
    }

    return ragRequestId;
  }

  private calculateRetryDelay(
    attempts: number,
  ): number {
    const exponentialDelay =
      CHAT_OUTBOX_BASE_RETRY_DELAY_MS *
      2 ** Math.max(attempts - 1, 0);

    return Math.min(
      exponentialDelay,
      CHAT_OUTBOX_MAX_RETRY_DELAY_MS,
    );
  }

  private getErrorMessage(
    error: unknown,
  ): string {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return message.slice(0, 5_000);
  }
}
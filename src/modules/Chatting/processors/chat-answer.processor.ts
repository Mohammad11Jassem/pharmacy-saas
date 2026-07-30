import { Injectable, Logger } from '@nestjs/common';

import { Processor, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import {
  CHAT_ANSWER_QUEUE,
  GENERATE_CHAT_ANSWER_JOB,
} from '../queues/chat-answer-queue.constants.js';

import {
  GenerateChatAnswerJobData,
  GenerateChatAnswerJobResult,
} from '../queues/chat-answer-queue.types.js';

import { ProcessChatAnswerUseCase } from '../use-cases/process-chat-answer.usecase.js';

import { ChatRealtimePublisher } from '../services/chat-realtime-publisher.service.js';

@Injectable()
@Processor(CHAT_ANSWER_QUEUE, {
  concurrency: 2,
})
export class ChatAnswerProcessor extends WorkerHost {
  private readonly logger = new Logger(ChatAnswerProcessor.name);

  constructor(
    private readonly processChatAnswerUseCase: ProcessChatAnswerUseCase,

    private readonly chatRealtimePublisher: ChatRealtimePublisher,
  ) {
    super();
  }

  async process(
    job: Job<GenerateChatAnswerJobData, GenerateChatAnswerJobResult, string>,
  ): Promise<GenerateChatAnswerJobResult> {
    if (job.name !== GENERATE_CHAT_ANSWER_JOB) {
      throw new Error(`Unsupported chat job: ${job.name}`);
    }

    const { ragRequestId } = job.data;

    this.logger.log(
      `Processing chat answer job ${job.id} for RagRequest ${ragRequestId}.`,
    );

    try {
      const result = await this.processChatAnswerUseCase.execute(ragRequestId);

      if (result.outcome === 'SUCCEEDED') {
        /*
         * فشل WebSocket لا يجب أن يفشل الـJob؛
         * قاعدة البيانات هي مصدر الحقيقة.
         */
        try {
          await this.chatRealtimePublisher.publishRequestSucceeded(
            ragRequestId,
          );
        } catch (notificationError: unknown) {
          this.logger.error(
            `RagRequest ${ragRequestId} succeeded, but its WebSocket success event could not be published.`,
            notificationError instanceof Error
              ? notificationError.stack
              : String(notificationError),
          );
        }
      }

      this.logger.log(
        `Completed chat answer job ${job.id} for RagRequest ${ragRequestId}. Outcome: ${result.outcome}.`,
      );

      return {
        ragRequestId,

        processedAt: new Date().toISOString(),

        mode: 'MOCK',

        outcome: result.outcome,

        assistantMessageId: result.assistantMessageId,
      };
    } catch (error: unknown) {
      const maxAttempts = Number(job.opts.attempts ?? 1);

      /*
       * attemptsMade داخل المعالجة الحالية يمثل
       * عدد المحاولات السابقة؛ لذلك نضيف 1.
       */
      const currentAttempt = job.attemptsMade + 1;

      const isFinalAttempt = currentAttempt >= maxAttempts;

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Chat answer job ${job.id} failed on attempt ${currentAttempt}/${maxAttempts}: ${errorMessage}`,
      );

      /*
       * لا نحول RagRequest إلى FAILED في أول محاولة،
       * لأن BullMQ ستعيد المحاولة.
       */
      if (isFinalAttempt) {
        try {
          await this.processChatAnswerUseCase.markFailedAfterFinalAttempt(
            ragRequestId,

            this.resolveFailureCode(error),
          );
          try {
            await this.chatRealtimePublisher.publishRequestFailed(ragRequestId);
          } catch (notificationError: unknown) {
            this.logger.error(
              `RagRequest ${ragRequestId} failed, but its WebSocket failure event could not be published.`,
              notificationError instanceof Error
                ? notificationError.stack
                : String(notificationError),
            );
          }
        } catch (finalizationError: unknown) {
          this.logger.error(
            `Failed to finalize RagRequest ${ragRequestId} after the last BullMQ attempt.`,
            finalizationError instanceof Error
              ? finalizationError.stack
              : String(finalizationError),
          );
        }
      }

      /*
       * يجب إعادة رمي الخطأ حتى تعرف BullMQ أن
       * المحاولة فشلت وتنفذ Retry.
       */
      throw error;
    }
  }

  private resolveFailureCode(error: unknown): string {
    if (
      error instanceof Error &&
      error.message.startsWith('INVALID_RAG_RESPONSE:')
    ) {
      return 'INVALID_RAG_RESPONSE';
    }

    return 'RAG_PROCESSING_FAILED';
  }
}

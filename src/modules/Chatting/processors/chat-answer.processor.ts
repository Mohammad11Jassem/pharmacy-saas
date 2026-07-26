import { Injectable, Logger } from '@nestjs/common';

import {
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { setTimeout as delay } from 'node:timers/promises';

import {
  CHAT_ANSWER_QUEUE,
  GENERATE_CHAT_ANSWER_JOB,
} from '../queues/chat-answer-queue.constants';

import {
  GenerateChatAnswerJobData,
  GenerateChatAnswerJobResult,
} from '../queues/chat-answer-queue.types';

@Injectable()
@Processor(CHAT_ANSWER_QUEUE, {
  concurrency: 2,
})
export class ChatAnswerProcessor extends WorkerHost {
  private readonly logger = new Logger(
    ChatAnswerProcessor.name,
  );

  async process(
    job: Job<
      GenerateChatAnswerJobData,
      GenerateChatAnswerJobResult,
      string
    >,
  ): Promise<GenerateChatAnswerJobResult> {
    if (job.name !== GENERATE_CHAT_ANSWER_JOB) {
      throw new Error(
        `Unsupported chat job: ${job.name}`,
      );
    }

    const { ragRequestId } = job.data;

    this.logger.log(
      `Processing mock chat answer job ${job.id} for RagRequest ${ragRequestId}.`,
    );

    /*
     * Temporary simulation only.
     *
     * Later this will be replaced with:
     *
     * RagServiceClient → Python RAG Service
     */
    await delay(2_000);

    const result: GenerateChatAnswerJobResult = {
      ragRequestId,
      processedAt: new Date().toISOString(),
      mode: 'MOCK',
    };

    this.logger.log(
      `Completed mock chat answer job ${job.id} for RagRequest ${ragRequestId}.`,
    );

    return result;
  }
}
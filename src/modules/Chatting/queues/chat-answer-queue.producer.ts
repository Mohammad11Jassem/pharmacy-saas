import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';

import { Queue } from 'bullmq';

import {
  CHAT_ANSWER_QUEUE,
  GENERATE_CHAT_ANSWER_JOB,
} from './chat-answer-queue.constants';

import {
  GenerateChatAnswerJobData,
  GenerateChatAnswerJobResult,
} from './chat-answer-queue.types';

@Injectable()
export class ChatAnswerQueueProducer {
  constructor(
    @InjectQueue(CHAT_ANSWER_QUEUE)
    private readonly chatAnswerQueue: Queue<
      GenerateChatAnswerJobData,
      GenerateChatAnswerJobResult,
      typeof GENERATE_CHAT_ANSWER_JOB
    >,
  ) {}

  async enqueueGenerateAnswer(
    ragRequestId: number,
  ): Promise<{
    jobId: string;
    ragRequestId: number;
  }> {
    if (
      !Number.isInteger(ragRequestId) ||
      ragRequestId <= 0
    ) {
      throw new TypeError(
        'ragRequestId must be a positive integer.',
      );
    }

    /*
     * A deterministic job ID prevents adding the same
     * RagRequest to this queue more than once.
     *
     * Do not use ":" inside a BullMQ custom job ID.
     */
    const jobId = `rag-request-${ragRequestId}`;

    const job = await this.chatAnswerQueue.add(
      GENERATE_CHAT_ANSWER_JOB,
      {
        ragRequestId,
      },
      {
        jobId,
      },
    );

    return {
      jobId: String(job.id),
      ragRequestId,
    };
  }
}
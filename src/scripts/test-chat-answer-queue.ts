import { NestFactory } from '@nestjs/core';

import { setTimeout as delay } from 'node:timers/promises';

import { AppModule } from '../app.module';

import { ChatAnswerQueueProducer } from '../modules/Chatting/queues/chat-answer-queue.producer';

async function bootstrap(): Promise<void> {
  const application =
    await NestFactory.createApplicationContext(
      AppModule,
    );

  try {
    const producer = application.get(
      ChatAnswerQueueProducer,
    );

    /*
     * A different test ID each time avoids colliding
     * with a previous BullMQ job ID.
     */
    const testRagRequestId =
      Math.floor(Date.now() / 1_000);

    const result =
      await producer.enqueueGenerateAnswer(
        testRagRequestId,
      );

    console.log('Job added successfully:', result);

    /*
     * Keep the application alive long enough for
     * the local processor to consume the job.
     */
    await delay(4_000);
  } finally {
    await application.close();
  }
}

bootstrap().catch((error: unknown) => {
  console.error('Queue test failed:', error);
  process.exitCode = 1;
});
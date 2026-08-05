import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { ChattingController } from './controllers/chatting.controller';
import { ChattingService } from './services/chatting.service';

import { RagSubscriptionPolicyService } from './services/rag-subscription-policy.service';

import { CreateRagConversationUseCase } from './use-cases/create-rag-conversation.usecase';
import { RagUsageService } from './services/rag-usage.service';
import { SendChatMessageUseCase } from './use-cases/send-chat-message.usecase';
import { BullModule } from '@nestjs/bullmq';
import { CHAT_ANSWER_QUEUE } from './queues/chat-answer-queue.constants';
import { ChatAnswerProcessor } from './processors/chat-answer.processor';
import { ChatAnswerQueueProducer } from './queues/chat-answer-queue.producer';
import { StartChatConversationUseCase } from './use-cases/start-chat-conversation.usecase';
import { ChatOutboxDispatcher } from './outbox/chat-outbox.dispatcher';
import { ProcessChatAnswerUseCase } from './use-cases/process-chat-answer.usecase';
import { RagServiceClient } from './clients/rag-service-client';
import { MockRagServiceClient } from './clients/mock-rag-service.client';
import { JwtModule } from '@nestjs/jwt';
import { ChatRealtimePublisher } from './services/chat-realtime-publisher.service';
import { ChatSocketAuthService } from './services/chat-socket-auth.service';
import { ChattingGateway } from './gateways/chatting.gateway';
import { ListChatConversationsUseCase } from './use-cases/list-chat-conversations.usecase';
import { ListChatMessagesUseCase } from './use-cases/list-chat-messages.usecase';
import { GetChatRequestStatusUseCase } from './use-cases/get-chat-request-status.usecase';
import { ChatRequestController } from './controllers/chat-request.controller';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
    BullModule.registerQueue({
      name: CHAT_ANSWER_QUEUE,

      defaultJobOptions: {
        attempts: 3,

        backoff: {
          type: 'exponential',
          delay: 2_000,
        },

        /*
         * Keep recent completed/failed jobs for debugging.
         */
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 1_000,
        },

        removeOnFail: {
          age: 7 * 24 * 60 * 60,
          count: 5_000,
        },
      },
    }),
  ],
  controllers: [ChattingController ,ChatRequestController],

  providers: [
    ChattingService,

    RagSubscriptionPolicyService,

    RagUsageService,

    CreateRagConversationUseCase,

    SendChatMessageUseCase,

    ChatAnswerQueueProducer,

    ChatAnswerProcessor,

    StartChatConversationUseCase,

    ChatOutboxDispatcher,

    ProcessChatAnswerUseCase,

    {
      provide: RagServiceClient,
      useClass: MockRagServiceClient,
    },

    ChatSocketAuthService,

    ChattingGateway,

    ChatRealtimePublisher,

    ListChatConversationsUseCase,

    ListChatMessagesUseCase,

    GetChatRequestStatusUseCase,
  ],

  exports: [
    RagSubscriptionPolicyService,
    RagUsageService,
    ChatAnswerQueueProducer,
  ],
})
export class ChattingModule {}

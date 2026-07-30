import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  RagMessageRole,
  RagRequestStatus,
} from '../../../generated/prisma/enums.js';

import {
  PrismaService,
} from '../../../prisma/prisma.service.js';

import {
  ChattingGateway,
} from '../gateways/chatting.gateway.js';

import {
  ChatRequestFailedEvent,
  ChatRequestSucceededEvent,
} from '../types/chat-realtime-events.types.js';

@Injectable()
export class ChatRealtimePublisher {
  private readonly logger = new Logger(
    ChatRealtimePublisher.name,
  );

  constructor(
    private readonly prisma:
      PrismaService,

    private readonly chattingGateway:
      ChattingGateway,
  ) {}

  async publishRequestSucceeded(
    ragRequestId: number,
  ): Promise<void> {
    const request =
      await this.prisma.ragRequest.findUnique({
        where: {
          ragRequestId,
        },

        select: {
          ragRequestId: true,
          ragConversationId: true,
          turnNumber: true,
          status: true,
          finishedAt: true,
          latencyMs: true,

          conversation: {
            select: {
              pharmacyId: true,
              title: true,
            },
          },

          messages: {
            where: {
              role:
                RagMessageRole.ASSISTANT,
            },

            take: 1,

            select: {
              ragMessageId: true,
              role: true,
              content: true,
              createdAt: true,

              citations: {
                orderBy: {
                  position: 'asc',
                },

                select: {
                  ragMessageCitationId:
                    true,

                  position: true,
                  sourceType: true,
                  documentId: true,
                  chunkId: true,
                  title: true,
                  page: true,
                  snippet: true,
                  score: true,
                },
              },
            },
          },
        },
      });

    if (!request) {
      throw new Error(
        `RagRequest ${ragRequestId} was not found while publishing success.`,
      );
    }

    if (
      request.status !==
      RagRequestStatus.SUCCEEDED
    ) {
      this.logger.warn(
        `Success event was skipped for RagRequest ${ragRequestId} because its status is ${request.status}.`,
      );

      return;
    }

    if (!request.finishedAt) {
      throw new Error(
        `Succeeded RagRequest ${ragRequestId} does not have finishedAt.`,
      );
    }

    const assistantMessage =
      request.messages[0];

    if (!assistantMessage) {
      throw new Error(
        `Succeeded RagRequest ${ragRequestId} does not contain an ASSISTANT message.`,
      );
    }

    const payload:
      ChatRequestSucceededEvent = {
      ragRequestId:
        request.ragRequestId,

      ragConversationId:
        request.ragConversationId,

      turnNumber:
        request.turnNumber,

      status: 'SUCCEEDED',

      conversationTitle:
        request.conversation.title,

      finishedAt:
        request.finishedAt,

      latencyMs:
        request.latencyMs,

      assistantMessage: {
        ragMessageId:
          assistantMessage
            .ragMessageId,

        role: 'ASSISTANT',

        content:
          assistantMessage.content,

        createdAt:
          assistantMessage.createdAt,

        citations:
          assistantMessage.citations,
      },
    };

    this.chattingGateway
      .emitRequestSucceeded(
        request.conversation
          .pharmacyId,

        payload,
      );
  }

  async publishRequestFailed(
    ragRequestId: number,
  ): Promise<void> {
    const request =
      await this.prisma.ragRequest.findUnique({
        where: {
          ragRequestId,
        },

        select: {
          ragRequestId: true,
          ragConversationId: true,
          turnNumber: true,
          status: true,
          failureCode: true,
          finishedAt: true,

          conversation: {
            select: {
              pharmacyId: true,
            },
          },
        },
      });

    if (!request) {
      throw new Error(
        `RagRequest ${ragRequestId} was not found while publishing failure.`,
      );
    }

    if (
      request.status !==
      RagRequestStatus.FAILED
    ) {
      this.logger.warn(
        `Failure event was skipped for RagRequest ${ragRequestId} because its status is ${request.status}.`,
      );

      return;
    }

    if (!request.finishedAt) {
      throw new Error(
        `Failed RagRequest ${ragRequestId} does not have finishedAt.`,
      );
    }

    const payload:
      ChatRequestFailedEvent = {
      ragRequestId:
        request.ragRequestId,

      ragConversationId:
        request.ragConversationId,

      turnNumber:
        request.turnNumber,

      status: 'FAILED',

      failureCode:
        request.failureCode ??
        'RAG_PROCESSING_FAILED',

      finishedAt:
        request.finishedAt,
    };

    this.chattingGateway
      .emitRequestFailed(
        request.conversation
          .pharmacyId,

        payload,
      );
  }
}
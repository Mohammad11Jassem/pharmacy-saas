import { Injectable, NotFoundException } from '@nestjs/common';

import { RagMessageRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  getPaginationParams,
  toPaginatedResult,
} from '../../../common/pagination/pagination.util';

import { ListChatMessagesQueryDto } from '../dto/list-chat-messages-query.dto';

@Injectable()
export class ListChatMessagesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    pharmacyId: number,
    ragConversationId: number,
    query: ListChatMessagesQueryDto,
  ) {
    const conversation = await this.prisma.ragConversation.findFirst({
      where: {
        ragConversationId,
        pharmacyId,
      },
      select: {
        ragConversationId: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('RAG conversation was not found.');
    }

    const { page, limit, skip, take } = getPaginationParams(
      query.page,
      query.limit,
    );

    const [requests, total] = await Promise.all([
      this.prisma.ragRequest.findMany({
        where: {
          ragConversationId,
        },
        skip,
        take,
        /*
         * Page 1 contains the newest turns so opening a long conversation is
         * efficient. We reverse only the fetched page before returning it so
         * the frontend receives the turns in normal chronological order.
         */
        orderBy: {
          turnNumber: 'desc',
        },
        select: {
          ragRequestId: true,
          turnNumber: true,
          status: true,
          failureCode: true,
          leaseExpiresAt: true,
          startedAt: true,
          finishedAt: true,
          latencyMs: true,
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
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
                  ragMessageCitationId: true,
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
      }),
      this.prisma.ragRequest.count({
        where: {
          ragConversationId,
        },
      }),
    ]);

    const items = requests.reverse().map((request) => {
      const userMessage = request.messages.find(
        (message) => message.role === RagMessageRole.USER,
      );

      const assistantMessage = request.messages.find(
        (message) => message.role === RagMessageRole.ASSISTANT,
      );

      return {
        ragRequestId: request.ragRequestId,
        ragConversationId,
        turnNumber: request.turnNumber,
        status: request.status,
        failureCode: request.failureCode,
        leaseExpiresAt: request.leaseExpiresAt,
        startedAt: request.startedAt,
        finishedAt: request.finishedAt,
        latencyMs: request.latencyMs,
        userMessage: userMessage
          ? {
              ragMessageId: userMessage.ragMessageId,
              role: userMessage.role,
              content: userMessage.content,
              createdAt: userMessage.createdAt,
            }
          : null,
        assistantMessage: assistantMessage
          ? {
              ragMessageId: assistantMessage.ragMessageId,
              role: assistantMessage.role,
              content: assistantMessage.content,
              createdAt: assistantMessage.createdAt,
              citations: assistantMessage.citations,
            }
          : null,
      };
    });

    return toPaginatedResult(items, total, page, limit);
  }
}

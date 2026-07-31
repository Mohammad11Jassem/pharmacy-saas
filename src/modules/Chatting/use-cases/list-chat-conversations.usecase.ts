import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  getPaginationParams,
  toPaginatedResult,
} from '../../../common/pagination/pagination.util';

import { ListChatConversationsQueryDto } from '../dto/list-chat-conversations-query.dto';

const LAST_MESSAGE_PREVIEW_LENGTH = 160;

@Injectable()
export class ListChatConversationsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    pharmacyId: number,
    query: ListChatConversationsQueryDto,
  ) {
    const { page, limit, skip, take } = getPaginationParams(
      query.page,
      query.limit,
    );

    const where: Prisma.RagConversationWhereInput = {
      pharmacyId,
      archivedAt: null,
    };

    const [conversations, total] = await Promise.all([
      this.prisma.ragConversation.findMany({
        where,
        skip,
        take,
        orderBy: [
          {
            lastMessageAt: {
              sort: 'desc',
              nulls: 'last',
            },
          },
          {
            createdAt: 'desc',
          },
        ],
        select: {
          ragConversationId: true,
          title: true,
          lastMessageAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              requests: true,
            },
          },
          requests: {
            orderBy: {
              turnNumber: 'desc',
            },
            take: 1,
            select: {
              ragRequestId: true,
              turnNumber: true,
              status: true,
              failureCode: true,
              startedAt: true,
              finishedAt: true,
              messages: {
                orderBy: {
                  createdAt: 'desc',
                },
                take: 1,
                select: {
                  ragMessageId: true,
                  role: true,
                  content: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.ragConversation.count({ where }),
    ]);

    const items = conversations.map((conversation) => {
      const latestRequest = conversation.requests[0] ?? null;
      const lastMessage = latestRequest?.messages[0] ?? null;

      return {
        ragConversationId: conversation.ragConversationId,
        title: conversation.title,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        turnsCount: conversation._count.requests,
        latestRequest: latestRequest
          ? {
              ragRequestId: latestRequest.ragRequestId,
              turnNumber: latestRequest.turnNumber,
              status: latestRequest.status,
              failureCode: latestRequest.failureCode,
              startedAt: latestRequest.startedAt,
              finishedAt: latestRequest.finishedAt,
            }
          : null,
        lastMessage: lastMessage
          ? {
              ragMessageId: lastMessage.ragMessageId,
              role: lastMessage.role,
              contentPreview: this.buildPreview(lastMessage.content),
              createdAt: lastMessage.createdAt,
            }
          : null,
      };
    });

    return toPaginatedResult(items, total, page, limit);
  }

  private buildPreview(content: string): string {
    const normalizedContent = content.trim();

    if (normalizedContent.length <= LAST_MESSAGE_PREVIEW_LENGTH) {
      return normalizedContent;
    }

    return `${normalizedContent.slice(0, LAST_MESSAGE_PREVIEW_LENGTH - 3)}...`;
  }
}

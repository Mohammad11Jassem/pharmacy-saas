import { Injectable, NotFoundException } from '@nestjs/common';

import { RagMessageRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class GetChatRequestStatusUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, ragRequestId: number) {
    const request = await this.prisma.ragRequest.findFirst({
      where: {
        ragRequestId,
        conversation: {
          pharmacyId,
        },
      },
      select: {
        ragRequestId: true,
        ragConversationId: true,
        turnNumber: true,
        status: true,
        failureCode: true,
        leaseExpiresAt: true,
        startedAt: true,
        finishedAt: true,
        latencyMs: true,
        conversation: {
          select: {
            title: true,
          },
        },
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
    });

    if (!request) {
      throw new NotFoundException('RAG request was not found.');
    }

    const userMessage = request.messages.find(
      (message) => message.role === RagMessageRole.USER,
    );

    const assistantMessage = request.messages.find(
      (message) => message.role === RagMessageRole.ASSISTANT,
    );

    return {
      ragRequestId: request.ragRequestId,
      ragConversationId: request.ragConversationId,
      turnNumber: request.turnNumber,
      status: request.status,
      conversationTitle: request.conversation.title,
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
  }
}

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { CreateRagConversationDto } from '../dto/create-rag-conversation.dto';
import { RagSubscriptionPolicyService } from '../services/rag-subscription-policy.service';

@Injectable()
export class CreateRagConversationUseCase {
  constructor(
    private readonly prisma: PrismaService,

    private readonly ragSubscriptionPolicyService:
      RagSubscriptionPolicyService,
  ) {}

  async execute(
    pharmacyId: number,
    dto: CreateRagConversationDto,
  ) {
    /*
     * Creating a conversation does not consume the monthly quota.
     *
     * We only verify that the current subscription allows RAG.
     */
    await this.ragSubscriptionPolicyService.getPolicyOrThrow(
      pharmacyId,
    );

    const title = dto.title?.trim();

    return this.prisma.ragConversation.create({
      data: {
        pharmacyId,

        /*
         * When title is undefined, Prisma uses the default value:
         *
         * New conversation
         */
        ...(title
          ? {
              title,
            }
          : {}),
      },

      select: {
        ragConversationId: true,
        title: true,
        lastMessageAt: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
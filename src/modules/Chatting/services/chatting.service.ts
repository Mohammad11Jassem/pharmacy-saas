import { Injectable } from '@nestjs/common';

import { CreateRagConversationDto } from '../dto/create-rag-conversation.dto';
import { CreateRagConversationUseCase } from '../use-cases/create-rag-conversation.usecase';
import { SendChatMessageUseCase } from '../use-cases/send-chat-message.usecase';
import { SendChatMessageDto } from '../dto/send-chat-message.dto';
import { StartChatConversationUseCase } from '../use-cases/start-chat-conversation.usecase';
import { StartChatConversationDto } from '../dto/start-chat-conversation.dto';
import { StartChatConversationResponse } from '../types/start-chat-conversation-response.type';

@Injectable()
export class ChattingService {
  constructor(
    private readonly createRagConversationUseCase: CreateRagConversationUseCase,
    private readonly sendChatMessageUseCase: SendChatMessageUseCase,
    private readonly startChatConversationUseCase: StartChatConversationUseCase,
  ) {}

  createConversation(pharmacyId: number, dto: CreateRagConversationDto) {
    return this.createRagConversationUseCase.execute(pharmacyId, dto);
  }

  sendMessage(
    pharmacyId: number,
    ragConversationId: number,
    dto: SendChatMessageDto,
  ) {
    return this.sendChatMessageUseCase.execute(
      pharmacyId,
      ragConversationId,
      dto,
    );
  }

  startConversation(
    pharmacyId: number,
    dto: StartChatConversationDto,
  ): Promise<StartChatConversationResponse> {
    return this.startChatConversationUseCase.execute(
      pharmacyId,
      dto,
    );
  }
}

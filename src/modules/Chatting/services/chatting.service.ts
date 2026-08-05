import { Injectable } from '@nestjs/common';

import { CreateRagConversationDto } from '../dto/create-rag-conversation.dto';
import { CreateRagConversationUseCase } from '../use-cases/create-rag-conversation.usecase';
import { SendChatMessageUseCase } from '../use-cases/send-chat-message.usecase';
import { SendChatMessageDto } from '../dto/send-chat-message.dto';
import { StartChatConversationUseCase } from '../use-cases/start-chat-conversation.usecase';
import { StartChatConversationDto } from '../dto/start-chat-conversation.dto';
import { StartChatConversationResponse } from '../types/start-chat-conversation-response.type';
import { ListChatConversationsUseCase } from '../use-cases/list-chat-conversations.usecase';
import { ListChatMessagesUseCase } from '../use-cases/list-chat-messages.usecase';
import { GetChatRequestStatusUseCase } from '../use-cases/get-chat-request-status.usecase';
import { ListChatMessagesQueryDto } from '../dto/list-chat-messages-query.dto';
import { ListChatConversationsQueryDto } from '../dto/list-chat-conversations-query.dto';

@Injectable()
export class ChattingService {
  constructor(
    private readonly createRagConversationUseCase: CreateRagConversationUseCase,
    private readonly sendChatMessageUseCase: SendChatMessageUseCase,
    private readonly startChatConversationUseCase: StartChatConversationUseCase,
    private readonly listChatConversationsUseCase: ListChatConversationsUseCase,
    private readonly listChatMessagesUseCase: ListChatMessagesUseCase,
    private readonly getChatRequestStatusUseCase: GetChatRequestStatusUseCase,
  ) {}

  listConversations(pharmacyId: number, query: ListChatConversationsQueryDto) {
    return this.listChatConversationsUseCase.execute(pharmacyId, query);
  }

  listMessages(
    pharmacyId: number,
    ragConversationId: number,
    query: ListChatMessagesQueryDto,
  ) {
    return this.listChatMessagesUseCase.execute(
      pharmacyId,
      ragConversationId,
      query,
    );
  }

  getRequestStatus(pharmacyId: number, ragRequestId: number) {
    return this.getChatRequestStatusUseCase.execute(pharmacyId, ragRequestId);
  }

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
    return this.startChatConversationUseCase.execute(pharmacyId, dto);
  }
}

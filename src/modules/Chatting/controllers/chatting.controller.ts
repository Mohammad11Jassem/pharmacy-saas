import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { ResponseMessage } from '../../../common/decorators/response-message.decorator';

import { AccountType } from '../../../generated/prisma/enums';

import { Auth } from '../../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../../iam/authentication/enums/auth-type.enum';
import { Roles } from '../../../iam/authorization/decorators/roles.decorator';
import { ActiveUser } from '../../../iam/decorators/active-user.decorator';

import { CreateRagConversationDto } from '../dto/create-rag-conversation.dto';
import { ChattingService } from '../services/chatting.service';
import { SendChatMessageDto } from '../dto/send-chat-message.dto';
import { StartChatConversationDto } from '../dto/start-chat-conversation.dto';

@Auth(AuthType.Bearer)
@Roles(AccountType.PHARMACY)
@Controller('Chatting/conversations')
export class ChattingController {
  constructor(private readonly chattingService: ChattingService) {}

  @Post()
  @ResponseMessage('RAG conversation created successfully.')
  createConversation(
    @ActiveUser('sub') pharmacyId: number,
    @Body() dto: CreateRagConversationDto,
  ) {
    return this.chattingService.createConversation(pharmacyId, dto);
  }

  /**
   * إرسال سؤال لاحق إلى محادثة موجودة.
   */
  @Post(':ragConversationId/messages')
  @HttpCode(HttpStatus.ACCEPTED)
  @ResponseMessage('The message was accepted for processing.')
  sendMessage(
    @ActiveUser('sub') pharmacyId: number,

    @Param('ragConversationId', ParseIntPipe)
    ragConversationId: number,

    @Body() dto: SendChatMessageDto,
  ) {
    return this.chattingService.sendMessage(pharmacyId, ragConversationId, dto);
  }

  /**
   * ينشئ المحادثة وأول سؤال معاً.
   */
  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  startConversation(
    @ActiveUser('sub') pharmacyId: number,

    @Body() dto: StartChatConversationDto,
  ) {
    return this.chattingService.startConversation(pharmacyId, dto);
  }
}

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { AccountType } from '../../../generated/prisma/enums';
import { Auth } from '../../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../../iam/authentication/enums/auth-type.enum';
import { Roles } from '../../../iam/authorization/decorators/roles.decorator';
import { ActiveUser } from '../../../iam/decorators/active-user.decorator';

import { ChattingService } from '../services/chatting.service';

@Auth(AuthType.Bearer)
@Roles(AccountType.PHARMACY)
@Controller('Chatting/requests')
export class ChatRequestController {
  constructor(private readonly chattingService: ChattingService) {}

  @Get(':ragRequestId')
  @ResponseMessage('Chat request status retrieved successfully.')
  getRequestStatus(
    @ActiveUser('sub') pharmacyId: number,
    @Param('ragRequestId', ParseIntPipe)
    ragRequestId: number,
  ) {
    return this.chattingService.getRequestStatus(
      pharmacyId,
      ragRequestId,
    );
  }
}

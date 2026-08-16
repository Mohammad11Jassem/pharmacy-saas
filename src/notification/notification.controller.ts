import { Controller, Get, Query } from '@nestjs/common';

import { NotificationService } from './notification.service';

import { AccountType, NotificationRecipientType } from '../generated/prisma/enums';

import { Auth } from '../iam/authentication/decorators/auth.decorator';

import { AuthType } from '../iam/authentication/enums/auth-type.enum';

import { Roles } from '../iam/authorization/decorators/roles.decorator';

import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';

@Controller('notifications')
@Auth(AuthType.Bearer)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // Get notifications for the logged-in pharmacy.
  @Get('pharmacy')
  @Roles(AccountType.PHARMACY)
  getPharmacyNotifications(
    @ActiveUser('sub')
    pharmacyId: number,
    @Query()
    dto : PaginationQueryDto
  ) {
    return this.notificationService.getAll(NotificationRecipientType.PHARMACY, pharmacyId, dto.page, dto.limit);
  }

  // Get notifications for the logged-in pharmacy owner.
  @Get('owner')
  @Roles(AccountType.PHARMACY_OWNER)
  getOwnerNotifications(
    @ActiveUser('sub')
    userId: number,
    @Query()
    dto : PaginationQueryDto
  ) {
    return this.notificationService.getOwnerNotifications(userId,dto);
  }
}

import { Controller, Get, Query } from '@nestjs/common';

import { ResponseMessage } from '../../../common/decorators/response-message.decorator';

import { AccountType } from '../../../generated/prisma/enums';

import { Auth } from '../../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../../iam/authentication/enums/auth-type.enum';

import { Roles } from '../../../iam/authorization/decorators/roles.decorator';

import { ActiveUser } from '../../../iam/decorators/active-user.decorator';

import { DailyDateQueryDto } from '../dto/daily-date-query.dto';

import {
  DailyActivitiesQueryDto,
  DailyAlertsQueryDto,
} from '../dto/daily-pagination-query.dto';

import { DailyWindowService } from '../services/daily-window.service';

@Auth(AuthType.Bearer)
@Roles(AccountType.PHARMACY_OWNER)
@Controller('daily-window')
export class DailyWindowController {
  constructor(private readonly dailyWindowService: DailyWindowService) {}

  @Get('cards')
  @ResponseMessage('Daily cards retrieved successfully.')
  getCards(
    @ActiveUser('sub')
    ownerUserId: number,

    @Query()
    query: DailyDateQueryDto,
  ) {
    return this.dailyWindowService.getCards(
      ownerUserId,
      query.pharmacy_id,
      query.date,
    );
  }

  /**
   * Return current stock and expiry alerts.
   */
  @Get('alerts')
  @ResponseMessage('Incoming alerts retrieved successfully.')
  getAlerts(
    @ActiveUser('sub')
    ownerUserId: number,

    @Query()
    query: DailyAlertsQueryDto,
  ) {
    return this.dailyWindowService.getAlerts(
      ownerUserId,
      query.pharmacy_id,
      query.page,
      query.limit,
    );
  }

  /**
   * Return invoice creation activities.
   */
  // @Get('activities')
  // @ResponseMessage(
  //   'Invoice activities retrieved successfully.',
  // )
  // getActivities(
  //   @ActiveUser('sub')
  //   ownerUserId: number,
  
  //   @Query()
  //   query: DailyActivitiesQueryDto,
  // ) {
  //   return this.dailyWindowService.getActivities(
  //     ownerUserId,
  //     query.pharmacy_id,
  //     query.date,
  //     query.page,
  //     query.limit,
  //   );
  // }
}

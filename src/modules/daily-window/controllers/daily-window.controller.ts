import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

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
@Roles(AccountType.PHARMACY)
@Controller('daily-window')
export class DailyWindowController {
  constructor(
    private readonly dailyWindowService:
      DailyWindowService,
  ) {}

 
  @Get('cards')
  @ResponseMessage(
    'Daily cards retrieved successfully.',
  )
  getCards(
    @ActiveUser('sub')
    pharmacyId: number,

    @Query()
    query: DailyDateQueryDto,
  ) {
    return this.dailyWindowService.getCards(
      pharmacyId,
      query.date,
    );
  }

  /**
   * Return current stock and expiry alerts.
   */
  @Get('alerts')
  @ResponseMessage(
    'Incoming alerts retrieved successfully.',
  )
  getAlerts(
    @ActiveUser('sub')
    pharmacyId: number,

    @Query()
    query: DailyAlertsQueryDto,
  ) {
    return this.dailyWindowService.getAlerts(
      pharmacyId,
      query.page,
      query.limit,
    );
  }

  /**
   * Return invoice creation activities.
   */
//   @Get('activities')
//   @ResponseMessage(
//     'Invoice activities retrieved successfully.',
//   )
//   getActivities(
//     @ActiveUser('sub')
//     pharmacyId: number,

//     @Query()
//     query: DailyActivitiesQueryDto,
//   ) {
//     return this.dailyWindowService.getActivities(
//       pharmacyId,
//       query.date,
//       query.page,
//       query.limit,
//     );
//   }
}
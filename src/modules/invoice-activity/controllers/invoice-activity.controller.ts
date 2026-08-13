import { Controller, Get, Query } from '@nestjs/common';

import { ResponseMessage } from '../../../common/decorators/response-message.decorator';

import { AccountType } from '../../../generated/prisma/enums';

import { Auth } from '../../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../../iam/authentication/enums/auth-type.enum';

import { Roles } from '../../../iam/authorization/decorators/roles.decorator';

import { ActiveUser } from '../../../iam/decorators/active-user.decorator';

import { GetInvoiceActivitiesQueryDto } from '../dto/get-invoice-activities-query.dto';

import { GetInvoiceActivitiesUseCase } from '../use-cases/get-invoice-activities.use-case';

@Auth(AuthType.Bearer)
@Roles(AccountType.PHARMACY_OWNER)
@Controller('daily-window/activities')
export class InvoiceActivityController {
  constructor(private readonly getActivities: GetInvoiceActivitiesUseCase) {}

  /**
   * Return invoice activities for one day.
   */
  @Get()
  @ResponseMessage('Invoice activities retrieved successfully.')
  findAll(
    @ActiveUser('sub')
    ownerUserId: number,
  

    @Query()
    query: GetInvoiceActivitiesQueryDto,
  ) {
    return this.getActivities.execute(
      ownerUserId,
      query.pharmacy_id,
      query.date,
      query.page,
      query.limit,
    );
  }
}

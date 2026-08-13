import { Module } from '@nestjs/common';

import { APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from '../../prisma/prisma.module';

import { InvoiceActivityController } from './controllers/invoice-activity.controller';

import { InvoiceActivityInterceptor } from './interceptors/invoice-activity.interceptor';

import { InvoiceActivityService } from './services/invoice-activity.service';

import { GetInvoiceActivitiesUseCase } from './use-cases/get-invoice-activities.use-case';
import { EnsureOwnerPharmacyAccessUseCase } from '../../common/use-cases/ensure-owner-pharmacy-access.use-case';

@Module({
  imports: [PrismaModule],

  controllers: [InvoiceActivityController],

  providers: [
    InvoiceActivityService,
    EnsureOwnerPharmacyAccessUseCase,
    GetInvoiceActivitiesUseCase,

    {
      provide: APP_INTERCEPTOR,
      useClass: InvoiceActivityInterceptor,
    },
  ],
})
export class InvoiceActivityModule {}

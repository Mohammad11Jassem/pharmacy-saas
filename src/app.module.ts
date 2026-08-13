import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { CodeGenerationModule } from './common/code-generation/code-generation.module';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module';
import { PharmacyCredentialsModule } from './modules/pharmacy-credentials/pharmacy-credentials.module';
import { PharmacyDocumentTypesModule } from './modules/pharmacy-document-types/pharmacy-document-types.module';
import { PharmacyDocumentsModule } from './modules/pharmacy-documents/pharmacy-documents.module';
import { PharmacyOwnersModule } from './modules/pharmacy-owners/pharmacy-owners.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { DrugCatalogModule } from './modules/drug-catalog/drug-catalog.module';
import { IamModule } from './iam/iam.module';
import { PurchaseOrderItemModule } from './modules/purchase-order-item/purchase-order-item.module';
import { PurchaseOrderModule } from './modules/purchase-order/purchase-order.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { SupplierInvoiceModule } from './modules/supplier-invoice/supplier-invoice.module';
import { SupplierInvoiceItemModule } from './modules/supplier-invoice-item/supplier-invoice-item.module';
import { BatchModule } from './modules/batch/batch.module';
import { CustomerRequestModule } from './modules/customer-request/customer-request.module';
import { CustomerRequestItemModule } from './modules/customer-request-item/customer-request-item.module';
import { PharmacyDrugsModule } from './modules/pharmacy-drug/pharmacy-drugs.module';
import { SaleInvoiceModule } from './modules/sale-invoice/sale-invoice.module';
import { SaleInvoiceItemModule } from './modules/sale-invoice-item/sale-invoice-item.module';
import { PatientModule } from './modules/patient/patient.module';
import { ReturnInvoiceModule } from './modules/return-invoice/return-invoice.module';
import { ReturnInvoiceItemModule } from './modules/return-invoice-item/return-invoice-item.module';
import { DamageInvoiceModule } from './modules/damage-invoices/damage-invoice.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { ChattingModule } from './modules/Chatting/chatting.module';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DailyWindowModule } from './modules/daily-window/daily-window.module';
import { InvoiceActivityModule } from './modules/invoice-activity/invoice-activity.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SubscriptionPaymentModule } from './modules/subscription-payment/subscription-payment.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AppModule,
    PrismaModule,
    UsersModule,
    PharmacyOwnersModule,
    PharmacyModule,
    PharmacyCredentialsModule,
    PharmacyDocumentTypesModule,
    PharmacyDocumentsModule,
    CodeGenerationModule,
    IamModule,
    DrugCatalogModule,
    SupplierModule,
    PurchaseOrderModule,
    PurchaseOrderItemModule,
    SupplierInvoiceModule,
    SupplierInvoiceItemModule,
    BatchModule,
    CustomerRequestModule,
    CustomerRequestItemModule,
    PharmacyDrugsModule,
    SaleInvoiceModule,
    SaleInvoiceItemModule,
    PatientModule,
    ReturnInvoiceModule,
    ReturnInvoiceItemModule,
    DamageInvoiceModule,
    SubscriptionModule,
    SubscriptionPaymentModule,
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST') ?? '127.0.0.1';

        const port = Number(configService.get<string>('REDIS_PORT') ?? '6379');

        const password =
          configService.get<string>('REDIS_PASSWORD') || undefined;

        const db = Number(configService.get<string>('REDIS_DB') ?? '0');

        if (!Number.isInteger(port) || port <= 0) {
          throw new Error('REDIS_PORT must be a valid positive integer.');
        }

        if (!Number.isInteger(db) || db < 0) {
          throw new Error('REDIS_DB must be a valid non-negative integer.');
        }

        return {
          connection: {
            host,
            port,
            password,
            db,
          },
        };
      },
    }),
    ChattingModule,
    DailyWindowModule,
    InvoiceActivityModule,
    AnalyticsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    AppService
  ],
  controllers: [AppController],
})
export class AppModule {}

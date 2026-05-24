import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    PharmacyOwnersModule,
    PharmacyModule,
    PharmacyCredentialsModule,
    PharmacyDocumentTypesModule,
    PharmacyDocumentsModule,
    CodeGenerationModule,
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
  ],
})
export class AppModule {}
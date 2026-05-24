import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { DrugCatalogModule } from './modules/drug-catalog/drug-catalog.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    DrugCatalogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
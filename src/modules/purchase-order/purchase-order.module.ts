import { Module } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderController } from './purchase-order.controller';
import { SmartSuggestionsService } from './smart-suggestions/smart-suggestions.service';
import { SmartSuggestionsRepository } from './smart-suggestions/smart-suggestions.repository';
import { ExcelModule } from './excel/excel.module';

@Module({
  imports: [ExcelModule],
  controllers: [PurchaseOrderController],
  providers: [
    PurchaseOrderService,
    SmartSuggestionsService,
    SmartSuggestionsRepository,
  ],
})
export class PurchaseOrderModule {}

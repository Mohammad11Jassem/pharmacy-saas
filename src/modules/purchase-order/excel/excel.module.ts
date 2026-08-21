import { Module } from '@nestjs/common';
import { PurchaseOrderExcelService } from './purchase-order-excel.service';


@Module({
  providers: [PurchaseOrderExcelService],

  exports: [PurchaseOrderExcelService],
})
export class ExcelModule {}

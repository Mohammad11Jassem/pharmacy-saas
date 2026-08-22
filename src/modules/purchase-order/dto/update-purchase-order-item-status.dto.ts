import {
  IsEnum,
} from 'class-validator';

import {
  PurchaseOrderItemStatus,
} from '../../../generated/prisma/client';


export class UpdatePurchaseOrderItemStatusDto {

  @IsEnum(PurchaseOrderItemStatus)
  status: PurchaseOrderItemStatus;

}
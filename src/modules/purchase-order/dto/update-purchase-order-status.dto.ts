import { IsEnum } from "class-validator";
import { OrderStatus } from "../../../generated/prisma/enums";

export class UpdatePurchaseOrderStatusDto {

 @IsEnum(OrderStatus)
 status: OrderStatus;

}

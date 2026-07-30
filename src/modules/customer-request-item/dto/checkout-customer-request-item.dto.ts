import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CheckoutCustomerRequestItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerRequestItemId: number;

  /**
   * Quantity sold using the largest sale unit resolved by the backend
   * for this specific drug (for example BOX or STRIP).
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  saleQuantity: number;
}

import { ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListPharmacySubscriptionsDto extends PaginationQueryDto {}
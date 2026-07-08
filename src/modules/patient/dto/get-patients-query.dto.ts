import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export enum PatientSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  FULL_NAME = 'fullName',
  PATIENT_ID = 'patientId',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetPatientsQueryDto extends PaginationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  patientId?: number;

  /**
   * يبحث في:
   * fullName
   * phone
   * nationalId
   */
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(PatientSortBy)
  @IsOptional()
  sortBy?: PatientSortBy = PatientSortBy.CREATED_AT;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;
}
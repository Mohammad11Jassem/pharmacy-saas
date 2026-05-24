import { PartialType } from '@nestjs/swagger';
import { CreatePharmacyOwnerDto } from './create-pharmacy-owner.dto';

export class UpdatePharmacyOwnerDto extends PartialType(CreatePharmacyOwnerDto) {}

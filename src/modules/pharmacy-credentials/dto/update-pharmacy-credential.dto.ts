import { PartialType } from '@nestjs/swagger';
import { CreatePharmacyCredentialDto } from './create-pharmacy-credential.dto';

export class UpdatePharmacyCredentialDto extends PartialType(CreatePharmacyCredentialDto) {}

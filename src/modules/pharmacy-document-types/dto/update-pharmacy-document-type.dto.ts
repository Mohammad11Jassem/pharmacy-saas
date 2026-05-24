import { PartialType } from '@nestjs/swagger';
import { CreatePharmacyDocumentTypeDto } from './create-pharmacy-document-type.dto';

export class UpdatePharmacyDocumentTypeDto extends PartialType(CreatePharmacyDocumentTypeDto) {}

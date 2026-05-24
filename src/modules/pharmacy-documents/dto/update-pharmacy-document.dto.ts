import { PartialType } from '@nestjs/swagger';
import { CreatePharmacyDocumentDto } from './create-pharmacy-document.dto';

export class UpdatePharmacyDocumentDto extends PartialType(CreatePharmacyDocumentDto) {}

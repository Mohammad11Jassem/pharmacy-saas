import { Injectable } from '@nestjs/common';
import { CreatePharmacyDocumentTypeDto } from './dto/create-pharmacy-document-type.dto';
import { UpdatePharmacyDocumentTypeDto } from './dto/update-pharmacy-document-type.dto';

@Injectable()
export class PharmacyDocumentTypesService {
  create(createPharmacyDocumentTypeDto: CreatePharmacyDocumentTypeDto) {
    return 'This action adds a new pharmacyDocumentType';
  }

  findAll() {
    return `This action returns all pharmacyDocumentTypes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pharmacyDocumentType`;
  }

  update(id: number, updatePharmacyDocumentTypeDto: UpdatePharmacyDocumentTypeDto) {
    return `This action updates a #${id} pharmacyDocumentType`;
  }

  remove(id: number) {
    return `This action removes a #${id} pharmacyDocumentType`;
  }
}

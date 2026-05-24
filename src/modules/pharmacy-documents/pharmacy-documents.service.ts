import { Injectable } from '@nestjs/common';
import { CreatePharmacyDocumentDto } from './dto/create-pharmacy-document.dto';
import { UpdatePharmacyDocumentDto } from './dto/update-pharmacy-document.dto';

@Injectable()
export class PharmacyDocumentsService {
  create(createPharmacyDocumentDto: CreatePharmacyDocumentDto) {
    return 'This action adds a new pharmacyDocument';
  }

  findAll() {
    return `This action returns all pharmacyDocuments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pharmacyDocument`;
  }

  update(id: number, updatePharmacyDocumentDto: UpdatePharmacyDocumentDto) {
    return `This action updates a #${id} pharmacyDocument`;
  }

  remove(id: number) {
    return `This action removes a #${id} pharmacyDocument`;
  }
}

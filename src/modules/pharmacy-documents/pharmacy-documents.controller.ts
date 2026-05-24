import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PharmacyDocumentsService } from './pharmacy-documents.service';
import { CreatePharmacyDocumentDto } from './dto/create-pharmacy-document.dto';
import { UpdatePharmacyDocumentDto } from './dto/update-pharmacy-document.dto';

@Controller('pharmacy-documents')
export class PharmacyDocumentsController {
  constructor(private readonly pharmacyDocumentsService: PharmacyDocumentsService) {}

  @Post()
  create(@Body() createPharmacyDocumentDto: CreatePharmacyDocumentDto) {
    return this.pharmacyDocumentsService.create(createPharmacyDocumentDto);
  }

  @Get()
  findAll() {
    return this.pharmacyDocumentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pharmacyDocumentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePharmacyDocumentDto: UpdatePharmacyDocumentDto) {
    return this.pharmacyDocumentsService.update(+id, updatePharmacyDocumentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pharmacyDocumentsService.remove(+id);
  }
}

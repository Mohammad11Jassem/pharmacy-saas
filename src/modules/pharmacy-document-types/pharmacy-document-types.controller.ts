import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PharmacyDocumentTypesService } from './pharmacy-document-types.service';
import { CreatePharmacyDocumentTypeDto } from './dto/create-pharmacy-document-type.dto';
import { UpdatePharmacyDocumentTypeDto } from './dto/update-pharmacy-document-type.dto';

@Controller('pharmacy-document-types')
export class PharmacyDocumentTypesController {
  constructor(private readonly pharmacyDocumentTypesService: PharmacyDocumentTypesService) {}

  @Post()
  create(@Body() createPharmacyDocumentTypeDto: CreatePharmacyDocumentTypeDto) {
    return this.pharmacyDocumentTypesService.create(createPharmacyDocumentTypeDto);
  }

  @Get()
  findAll() {
    return this.pharmacyDocumentTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pharmacyDocumentTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePharmacyDocumentTypeDto: UpdatePharmacyDocumentTypeDto) {
    return this.pharmacyDocumentTypesService.update(+id, updatePharmacyDocumentTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pharmacyDocumentTypesService.remove(+id);
  }
}

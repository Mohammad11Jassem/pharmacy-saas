import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PharmacyCredentialsService } from './pharmacy-credentials.service';
import { CreatePharmacyCredentialDto } from './dto/create-pharmacy-credential.dto';
import { UpdatePharmacyCredentialDto } from './dto/update-pharmacy-credential.dto';

@Controller('pharmacy-credentials')
export class PharmacyCredentialsController {
  constructor(private readonly pharmacyCredentialsService: PharmacyCredentialsService) {}

  @Post()
  create(@Body() createPharmacyCredentialDto: CreatePharmacyCredentialDto) {
    return this.pharmacyCredentialsService.create(createPharmacyCredentialDto);
  }

  @Get()
  findAll() {
    return this.pharmacyCredentialsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pharmacyCredentialsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePharmacyCredentialDto: UpdatePharmacyCredentialDto) {
    return this.pharmacyCredentialsService.update(+id, updatePharmacyCredentialDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pharmacyCredentialsService.remove(+id);
  }
}

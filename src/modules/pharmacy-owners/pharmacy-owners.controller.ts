import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PharmacyOwnersService } from './pharmacy-owners.service';
import { CreatePharmacyOwnerDto } from './dto/create-pharmacy-owner.dto';
import { UpdatePharmacyOwnerDto } from './dto/update-pharmacy-owner.dto';

@Controller('pharmacy-owners')
export class PharmacyOwnersController {
  constructor(private readonly pharmacyOwnersService: PharmacyOwnersService) {}

  @Post()
  create(@Body() createPharmacyOwnerDto: CreatePharmacyOwnerDto) {
    return this.pharmacyOwnersService.create(createPharmacyOwnerDto);
  }

  @Get()
  findAll() {
    return this.pharmacyOwnersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pharmacyOwnersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePharmacyOwnerDto: UpdatePharmacyOwnerDto) {
    return this.pharmacyOwnersService.update(+id, updatePharmacyOwnerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pharmacyOwnersService.remove(+id);
  }
}

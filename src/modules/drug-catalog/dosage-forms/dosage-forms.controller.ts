import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { DosageFormsService } from './dosage-forms.service';
import {
  CreateDosageFormDto,
  UpdateDosageFormDto,
} from '../dto/dosage-form.dto';

@Controller('dosage-forms')
export class DosageFormsController {
  constructor(private readonly dosageFormsService: DosageFormsService) {}

  @Post()
  create(@Body() dto: CreateDosageFormDto) {
    return this.dosageFormsService.create(dto);
  }

  @Get()
  findAll() {
    return this.dosageFormsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dosageFormsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDosageFormDto,
  ) {
    return this.dosageFormsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.dosageFormsService.remove(id);
  }
}
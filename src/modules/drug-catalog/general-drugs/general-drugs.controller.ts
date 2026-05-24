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
import { GeneralDrugsService } from './general-drugs.service';
import {
  CreateGeneralDrugDto,
  UpdateGeneralDrugDto,
} from '../dto/general-drug.dto';

@Controller('general-drugs')
export class GeneralDrugsController {
  constructor(private readonly generalDrugsService: GeneralDrugsService) {}

  @Post()
  create(@Body() dto: CreateGeneralDrugDto) {
    return this.generalDrugsService.create(dto);
  }

  @Get()
  findAll() {
    return this.generalDrugsService.findAll();
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.generalDrugsService.findByBarcode(barcode);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.generalDrugsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGeneralDrugDto,
  ) {
    return this.generalDrugsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.generalDrugsService.remove(id);
  }
}
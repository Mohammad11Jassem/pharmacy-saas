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
import { DrugCategoriesService } from './drug-categories.service';
import {
  CreateDrugCategoryDto,
  UpdateDrugCategoryDto,
} from '../dto/drug-category.dto';

@Controller('drug-categories')
export class DrugCategoriesController {
  constructor(private readonly drugCategoriesService: DrugCategoriesService) {}

  @Post()
  create(@Body() dto: CreateDrugCategoryDto) {
    return this.drugCategoriesService.create(dto);
  }

  @Get()
  findAll() {
    return this.drugCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.drugCategoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDrugCategoryDto,
  ) {
    return this.drugCategoriesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.drugCategoriesService.remove(id);
  }
}
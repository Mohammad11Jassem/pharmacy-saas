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
import { ActiveIngredientsService } from './active-ingredients.service';
import {
  CreateActiveIngredientDto,
  UpdateActiveIngredientDto,
} from '../dto/active-ingredient.dto';

@Controller('active-ingredients')
export class ActiveIngredientsController {
  constructor(
    private readonly activeIngredientsService: ActiveIngredientsService,
  ) {}

  @Post()
  create(@Body() dto: CreateActiveIngredientDto) {
    return this.activeIngredientsService.create(dto);
  }

  @Get()
  findAll() {
    return this.activeIngredientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.activeIngredientsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActiveIngredientDto,
  ) {
    return this.activeIngredientsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.activeIngredientsService.remove(id);
  }
}
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateActiveIngredientDto,
  UpdateActiveIngredientDto,
} from '../dto/active-ingredient.dto';

@Injectable()
export class ActiveIngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateActiveIngredientDto) {
    try {
      return await this.prisma.activeIngredient.create({
        data: {
          ingredientName: dto.ingredientName,
          description: dto.description,
        },
      });
    } catch (error) {
      if ((error as any).code === 'P2002') {
        throw new ConflictException('Ingredient name already exists');
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.activeIngredient.findMany({
      orderBy: {
        ingredientName: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const ingredient = await this.prisma.activeIngredient.findUnique({
      where: {
        ingredientId: id,
      },
    });

    if (!ingredient) {
      throw new NotFoundException('Active ingredient not found');
    }

    return ingredient;
  }

  async update(id: number, dto: UpdateActiveIngredientDto) {
    await this.findOne(id);

    try {
      return await this.prisma.activeIngredient.update({
        where: {
          ingredientId: id,
        },
        data: dto,
      });
    } catch (error) {
      if ((error as any).code === 'P2002') {
        throw new ConflictException('Ingredient name already exists');
      }

      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.activeIngredient.delete({
      where: {
        ingredientId: id,
      },
    });

    return {
      message: 'Active ingredient deleted successfully',
    };
  }
}
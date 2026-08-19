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
import {
  getPaginationParams,
  toPaginatedResult,
} from '../../../common/pagination/pagination.util';
import { SearchActiveIngredientsQueryDto } from '../dto/search-active-ingredients-query.dto';

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

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [activeIngredients, total] = await Promise.all([
      this.prisma.activeIngredient.findMany({
        skip,
        take: limit,

        orderBy: {
          ingredientName: 'asc',
        },
      }),

      this.prisma.activeIngredient.count(),
    ]);

    const pages = Math.ceil(total / limit);
    const hasNextPage = page < pages;
    const hasPreviousPage = page > 1;

    return {
      data: activeIngredients,
      page,
      limit,
      total,
      pages,
      hasNextPage,
      hasPreviousPage,
    };
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

  async search(dto: SearchActiveIngredientsQueryDto) {
    const name = dto.name.trim();
    const { page, limit, skip, take } = getPaginationParams(
      dto.page,
      dto.limit,
    );

    const where = {
      ingredientName: {
        contains: name,
        mode: 'insensitive' as const,
      },
    };

    const [ingredients, total] = await Promise.all([
      this.prisma.activeIngredient.findMany({
        where,
        skip,
        take,
        orderBy: {
          ingredientName: 'asc',
        },
        select: {
          ingredientId: true,
          ingredientName: true,
        },
      }),
      this.prisma.activeIngredient.count({
        where,
      }),
    ]);

    return toPaginatedResult(ingredients, total, page, limit);
  }
}

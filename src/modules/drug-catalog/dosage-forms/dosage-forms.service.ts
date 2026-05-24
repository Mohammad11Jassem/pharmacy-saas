import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateDosageFormDto,
  UpdateDosageFormDto,
} from '../dto/dosage-form.dto';

@Injectable()
export class DosageFormsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDosageFormDto) {
    try {
      return await this.prisma.dosageForm.create({
        data: {
          dosageFormName: dto.dosageFormName,
          formCategory: dto.formCategory,
        },
      });
    } catch (error) {
      if ((error as any).code === 'P2002') {
        throw new ConflictException('Dosage form already exists');
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.dosageForm.findMany({
      orderBy: {
        dosageFormName: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const dosageForm = await this.prisma.dosageForm.findUnique({
      where: {
        dosageFormId: id,
      },
    });

    if (!dosageForm) {
      throw new NotFoundException('Dosage form not found');
    }

    return dosageForm;
  }

  async update(id: number, dto: UpdateDosageFormDto) {
    await this.findOne(id);

    try {
      return await this.prisma.dosageForm.update({
        where: {
          dosageFormId: id,
        },
        data: dto,
      });
    } catch (error) {
      if ((error as any).code === 'P2002') {
        throw new ConflictException('Dosage form already exists');
      }

      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.dosageForm.delete({
      where: {
        dosageFormId: id,
      },
    });

    return {
      message: 'Dosage form deleted successfully',
    };
  }
}
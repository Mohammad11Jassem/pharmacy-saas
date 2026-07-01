import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Prisma } from '../../generated/prisma/client';
import { SupplierFilterDto } from './dto/create-supplier-filter.dto';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async create(pharmacyId: number, dto: CreateSupplierDto) {
    await this.ensurePharmacyExists(pharmacyId);

    await this.ensureSupplierNameIsUnique(pharmacyId, dto.supplierName);

    if (dto.phone) {
      await this.ensureSupplierPhoneIsUnique(pharmacyId, dto.phone);
    }

    try {
      return await this.prisma.supplier.create({
        data: {
          pharmacyId,
          supplierName: dto.supplierName,
          phone: dto.phone,
          address: dto.address,
          notes: dto.notes,
        },
      });
    } catch (error) {
      if ((error as any).code === 'P2002') {
        throw new ConflictException('Supplier unique constraint violation');
      }

      throw error;
    }
  }

  findAll(pharmacyId: number, filters?: SupplierFilterDto) {
    const { searchQuery } = filters || {};

    return this.prisma.supplier.findMany({
      where: {
        pharmacyId,
        ...(searchQuery
          ? {
              OR: [
                {
                  supplierName: { contains: searchQuery, mode: 'insensitive' },
                },
                { phone: { contains: searchQuery, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { supplierName: 'asc' },
    });
  }

  // جلب معلومات مورد محدد خاص بصيدليتي فقط
  async findOne(id: number, pharmacyId: number) {
    const s = await this.prisma.supplier.findFirst({
      where: {
        supplierId: id,
        pharmacyId: pharmacyId,
      },
    });

    if (!s)
      throw new NotFoundException(
        'Supplier not found or belongs to another pharmacy',
      );
    return s;
  }

  async update(id: number, pharmacyId: number, dto: UpdateSupplierDto) {
    const existing = await this.prisma.supplier.findFirst({
      where: {
        supplierId: id,
        pharmacyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Supplier not found');
    }

    if (
      dto.supplierName !== undefined &&
      dto.supplierName !== existing.supplierName
    ) {
      await this.ensureSupplierNameIsUnique(pharmacyId, dto.supplierName, id);
    }

    if (dto.phone !== undefined && dto.phone !== existing.phone) {
      await this.ensureSupplierPhoneIsUnique(pharmacyId, dto.phone, id);
    }

    try {
      return await this.prisma.supplier.update({
        where: {
          supplierId: id,
        },
        data: {
          supplierName: dto.supplierName,
          phone: dto.phone,
          address: dto.address,
          notes: dto.notes,
        },
      });
    } catch (error) {
      if ((error as any).code === 'P2002') {
        throw new ConflictException('Supplier unique constraint violation');
      }

      throw error;
    }
  }

  async remove(id: number, pharmacyId: number) {
    await this.findOne(id, pharmacyId); // Ensure supplier exists and belongs to the pharmacy
    await this.prisma.supplier.delete({ where: { supplierId: id } });
    return { message: 'Supplier deleted successfully' };
  }

  private async ensurePharmacyExists(pharmacyId: number) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: {
        pharmacyId,
      },
      select: {
        pharmacyId: true,
      },
    });

    if (!pharmacy) {
      throw new BadRequestException('Invalid pharmacyId');
    }
  }

  private async ensureSupplierNameIsUnique(
    pharmacyId: number,
    supplierName: string,
    excludeSupplierId?: number,
  ) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        pharmacyId,
        supplierName,
        ...(excludeSupplierId
          ? {
              supplierId: {
                not: excludeSupplierId,
              },
            }
          : {}),
      },
      select: {
        supplierId: true,
      },
    });

    if (supplier) {
      throw new ConflictException('Supplier with this name already exists');
    }
  }

  private async ensureSupplierPhoneIsUnique(
    pharmacyId: number,
    phone: string,
    excludeSupplierId?: number,
  ) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        pharmacyId,
        phone,
        ...(excludeSupplierId
          ? {
              supplierId: {
                not: excludeSupplierId,
              },
            }
          : {}),
      },
      select: {
        supplierId: true,
      },
    });

    if (supplier) {
      throw new ConflictException('Supplier with this phone already exists');
    }
  }
}

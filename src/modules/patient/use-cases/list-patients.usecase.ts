import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  getPaginationParams,
  toPaginatedResult,
} from '../../../common/pagination/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  GetPatientsQueryDto,
  PatientSortBy,
  SortOrder,
} from '../dto/get-patients-query.dto';

@Injectable()
export class ListPatientsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    pharmacyId: number,
    query: GetPatientsQueryDto,
  ) {
    const { page, limit, skip, take } = getPaginationParams(
      query.page,
      query.limit,
    );

    const where = this.buildWhere(
      pharmacyId,
      query,
    );

    const orderBy = this.buildOrderBy(query);

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,

        select: {
          patientId: true,
          fullName: true,
          phone: true,
          nationalId: true,
          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              invoices: true,
            },
          },
        },

        orderBy,
        skip,
        take,
      }),

      this.prisma.patient.count({
        where,
      }),
    ]);

    const mappedPatients = patients.map((patient) => ({
      patientId: patient.patientId,
      fullName: patient.fullName,
      phone: patient.phone,
      nationalId: patient.nationalId,

      invoicesCount: patient._count.invoices,

      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    }));

    return toPaginatedResult(
      mappedPatients,
      total,
      page,
      limit,
    );
  }

  private buildWhere(
    pharmacyId: number,
    query: GetPatientsQueryDto,
  ): Prisma.PatientWhereInput {
    const where: Prisma.PatientWhereInput = {
      /**
       * أهم شرط:
       * لا نعيد إلا مرضى الصيدلية الحالية.
       */
      pharmacyId,
    };

    if (query.patientId !== undefined) {
      where.patientId = query.patientId;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();

      where.OR = [
        {
          fullName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: search,
          },
        },
        {
          nationalId: {
            contains: search,
          },
        },
      ];
    }

    return where;
  }

  private buildOrderBy(
    query: GetPatientsQueryDto,
  ): Prisma.PatientOrderByWithRelationInput {
    const sortOrder =
      query.sortOrder ?? SortOrder.DESC;

    switch (query.sortBy) {
      case PatientSortBy.FULL_NAME:
        return {
          fullName: sortOrder,
        };

      case PatientSortBy.PATIENT_ID:
        return {
          patientId: sortOrder,
        };

      case PatientSortBy.UPDATED_AT:
        return {
          updatedAt: sortOrder,
        };

      case PatientSortBy.CREATED_AT:
      default:
        return {
          createdAt: sortOrder,
        };
    }
  }
}
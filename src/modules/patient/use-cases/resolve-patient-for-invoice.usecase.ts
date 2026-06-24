import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
} from '../../../generated/prisma/client';
import { CreateInvoicePatientDto } from '../dto/create-invoice-patient.dto';

type ResolvePatientForInvoiceInput = {
  patientId?: number;
  patient?: CreateInvoicePatientDto;
};

@Injectable()
export class ResolvePatientForInvoiceUseCase {
  async execute(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    input: ResolvePatientForInvoiceInput,
  ): Promise<number | undefined> {
    if (input.patientId && input.patient) {
      throw new BadRequestException(
        'Send either patientId or patient, not both',
      );
    }

    if (input.patientId) {
      return this.resolveExistingPatient(
        tx,
        pharmacyId,
        input.patientId,
      );
    }

    if (input.patient) {
      return this.resolveOrCreatePatient(
        tx,
        pharmacyId,
        input.patient,
      );
    }

    return undefined;
  }

  private async resolveExistingPatient(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    patientId: number,
  ): Promise<number> {
    const patient = await tx.patient.findFirst({
      where: {
        patientId,
        pharmacyId,
      },
      select: {
        patientId: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found for this pharmacy',
      );
    }

    return patient.patientId;
  }

  private async resolveOrCreatePatient(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    patientDto: CreateInvoicePatientDto,
  ): Promise<number> {
    const fullName = patientDto.fullName?.trim();
    const phone = patientDto.phone?.trim();
    const nationalId = patientDto.nationalId?.trim();

    if (!fullName) {
      throw new BadRequestException('patient.fullName is required');
    }

    const identityFilters: Prisma.PatientWhereInput[] = [];

    if (phone) {
      identityFilters.push({ phone });
    }

    if (nationalId) {
      identityFilters.push({ nationalId });
    }

    if (identityFilters.length > 0) {
      const existingPatient = await tx.patient.findFirst({
        where: {
          pharmacyId,
          OR: identityFilters,
        },
        select: {
          patientId: true,
        },
      });

      if (existingPatient) {
        return existingPatient.patientId;
      }
    }

    try {
      const createdPatient = await tx.patient.create({
        data: {
          pharmacyId,
          fullName,
          phone: phone || undefined,
          nationalId: nationalId || undefined,
        },
        select: {
          patientId: true,
        },
      });

      return createdPatient.patientId;
    } catch (error) {
      /**
       * في حال حدث سباق على إنشاء نفس المريض بنفس phone أو nationalId،
       * فالـ unique constraint يمنع التكرار، ثم نحاول قراءة المريض الموجود.
       */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        identityFilters.length > 0
      ) {
        const existingPatient = await tx.patient.findFirst({
          where: {
            pharmacyId,
            OR: identityFilters,
          },
          select: {
            patientId: true,
          },
        });

        if (existingPatient) {
          return existingPatient.patientId;
        }
      }

      throw error;
    }
  }
}
import { Module } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { ResolvePatientForInvoiceUseCase } from './use-cases/resolve-patient-for-invoice.usecase';

@Module({
  controllers: [PatientController],
  providers: [
    PatientService,
    ResolvePatientForInvoiceUseCase,
  ],
  exports: [
    ResolvePatientForInvoiceUseCase,
  ],
})
export class PatientModule {}
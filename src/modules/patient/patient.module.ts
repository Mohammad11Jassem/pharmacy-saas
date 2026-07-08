import { Module } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { ResolvePatientForInvoiceUseCase } from './use-cases/resolve-patient-for-invoice.usecase';
import { ListPatientsUseCase } from './use-cases/list-patients.usecase';

@Module({
  controllers: [PatientController],
  providers: [
    PatientService,
    ResolvePatientForInvoiceUseCase,
    ListPatientsUseCase,
  ],
  exports: [ResolvePatientForInvoiceUseCase],
})
export class PatientModule {}

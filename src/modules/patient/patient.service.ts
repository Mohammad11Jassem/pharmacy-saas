import { Injectable } from '@nestjs/common';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { GetPatientsQueryDto } from './dto/get-patients-query.dto';
import { ListPatientsUseCase } from './use-cases/list-patients.usecase';

@Injectable()
export class PatientService {
  constructor(private readonly listPatientsUseCase: ListPatientsUseCase) {}
  create(createPatientDto: CreatePatientDto) {
    return 'This action adds a new patient';
  }

  findAll(pharmacyId: number, query: GetPatientsQueryDto) {
    return this.listPatientsUseCase.execute(pharmacyId, query);
  }

  findOne(id: number) {
    return `This action returns a #${id} patient`;
  }

  update(id: number, updatePatientDto: UpdatePatientDto) {
    return `This action updates a #${id} patient`;
  }

  remove(id: number) {
    return `This action removes a #${id} patient`;
  }
}

import { Injectable } from "@nestjs/common";
import { AddGeneralDrugUseCase } from "./use-cases/add-general-drug.usecase";
import { AddGeneralDrugDto } from "./dto/add-general-drug.dto";
import { AddPrivateDrugDto } from "./dto/add-private-drug.dto";
import { AddPrivateDrugUseCase } from "./use-cases/add-private-drug.usecase";

@Injectable()
export class PharmacyDrugService {
  constructor(
    private readonly addGeneralDrugUseCase:
      AddGeneralDrugUseCase,

    private readonly addPrivateDrugUseCase:
      AddPrivateDrugUseCase,
  ) {}

  addGeneralDrug(
    pharmacyId: number,
    dto: AddGeneralDrugDto,
  ) {
    return this.addGeneralDrugUseCase.execute(
      pharmacyId,
      dto,
    );
  }

  addPrivateDrug(
    pharmacyId: number,
    dto: AddPrivateDrugDto,
  ) {
    return this.addPrivateDrugUseCase.execute(
      pharmacyId,
      dto,
    );
  }
}
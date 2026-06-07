import { Body, Controller, Post } from "@nestjs/common";
import { PharmacyDrugService } from "./pharmacy-drug.service";
import { ActiveUser } from "../../iam/decorators/active-user.decorator";
import { AddGeneralDrugDto } from "./dto/add-general-drug.dto";

@Controller('pharmacy-drugs')
export class PharmacyDrugsController {
  constructor(
    private readonly pharmacyDrugService: PharmacyDrugService,
  ) {}

  @Post('from-general')
  addGeneralDrug(
    @Body() dto: AddGeneralDrugDto,
    @ActiveUser('sub') pharmacyId: number,
  ) {
    return this.pharmacyDrugService.addGeneralDrug(
      pharmacyId,
      dto,
    );
  }
}
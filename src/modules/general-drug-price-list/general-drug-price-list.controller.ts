import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentPharmacy } from '../../common/decorators/current-pharmacy.decorator';
import { AccountType } from '../../generated/prisma/enums';
import { Auth } from '../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../iam/authentication/enums/auth-type.enum';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { PublishGeneralDrugPriceListDto } from './dto/publish-general-drug-price-list.dto';
import { GeneralDrugPriceListService } from './general-drug-price-list.service';

@Auth(AuthType.Bearer)
@Controller('general-drug-price-lists')
export class GeneralDrugPriceListController {
  constructor(
    private readonly generalDrugPriceListService: GeneralDrugPriceListService,
  ) {}

  /**
   * Medical Team / Admin publishes a new price list immediately.
   * There is no DRAFT/PUBLISHED state: successful creation means published.
   */
  @Roles(AccountType.ADMIN, AccountType.MEDICAL_TEAM)
  @Post()
  publish(@Body() dto: PublishGeneralDrugPriceListDto) {
    return this.generalDrugPriceListService.publish(dto);
  }

  /**
   * Tells the pharmacy whether a newer price list exists and how many of its
   * currently-added general drugs would actually change.
   */
  @Roles(AccountType.PHARMACY)
  @Get('status')
  getStatus(@CurrentPharmacy() pharmacyId: number) {
    return this.generalDrugPriceListService.getStatus(pharmacyId);
  }

  /**
   * Preview all pending price changes since the last list this pharmacy applied.
   * This also handles pharmacies that skipped one or more versions.
   */
  @Roles(AccountType.PHARMACY)
  @Get('latest/changes')
  getLatestChanges(@CurrentPharmacy() pharmacyId: number) {
    return this.generalDrugPriceListService.getLatestChanges(pharmacyId);
  }

  /**
   * Applies all official general-drug price changes published since the
   * pharmacy's last applied version. Drugs not owned by the pharmacy are ignored.
   */
  @Roles(AccountType.PHARMACY)
  @Post('latest/apply')
  applyLatest(@CurrentPharmacy() pharmacyId: number) {
    return this.generalDrugPriceListService.applyLatest(pharmacyId);
  }
}

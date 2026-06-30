import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CurrentPharmacy } from '../../common/decorators/current-pharmacy.decorator';
import { SupplierFilterDto } from './dto/create-supplier-filter.dto';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { AccountType } from '../../generated/prisma/enums';
import { Auth } from '../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../iam/authentication/enums/auth-type.enum';
@Auth(AuthType.Bearer)
@Roles(AccountType.PHARMACY)
@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post('create')
  create(
    @CurrentPharmacy() pharmacyId: number,
    @Body() dto: Omit<CreateSupplierDto, 'pharmacyId'>,
  ) {
    return this.supplierService.create({
      ...dto,
      pharmacyId,
    });
  }

  @Get()
  findAll(
    @CurrentPharmacy() pharmacyId: number,
    @Query() filters: SupplierFilterDto,
  ) {
    return this.supplierService.findAll(pharmacyId, filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentPharmacy() pharmacyId: number) {
    return this.supplierService.findOne(+id, pharmacyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @CurrentPharmacy() pharmacyId: number, // مررها إن قمت بتعديل التابع في الـ Service
  ) {
    return this.supplierService.update(+id, updateSupplierDto, pharmacyId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentPharmacy() pharmacyId: number, // للحماية
  ) {
    return this.supplierService.remove(+id, pharmacyId);
  }
}

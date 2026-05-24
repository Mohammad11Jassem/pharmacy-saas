import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { CreatePharmacyDto } from './dto/create-pharmacy.dto';
import { UpdatePharmacyDto } from './dto/update-pharmacy.dto';
import { CreatePharmacyAccountDto } from './dto/create-pharmacy-account.dto';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@ApiTags('Pharmacy')
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Post('create')
  @ResponseMessage('Pharmacy account created successfully')
  @ApiOperation({
    summary: 'Create pharmacy account with new or existing owner',
  })
  @ApiCreatedResponse({
    description: 'Pharmacy account created successfully.',
  })
  createPharmacyAccount(@Body() dto: CreatePharmacyAccountDto) {
    return this.pharmacyService.createPharmacyAccount(dto);
  }
}

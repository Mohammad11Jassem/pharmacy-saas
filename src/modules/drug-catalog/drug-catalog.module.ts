import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { ActiveIngredientsController } from './active-ingredients/active-ingredients.controller';
import { ActiveIngredientsService } from './active-ingredients/active-ingredients.service';

import { DosageFormsController } from './dosage-forms/dosage-forms.controller';
import { DosageFormsService } from './dosage-forms/dosage-forms.service';

import { DrugCategoriesController } from './drug-categories/drug-categories.controller';
import { DrugCategoriesService } from './drug-categories/drug-categories.service';

import { GeneralDrugsController } from './general-drugs/general-drugs.controller';
import { GeneralDrugsService } from './general-drugs/general-drugs.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ActiveIngredientsController,
    DosageFormsController,
    DrugCategoriesController,
    GeneralDrugsController,
  ],
  providers: [
    ActiveIngredientsService,
    DosageFormsService,
    DrugCategoriesService,
    GeneralDrugsService,
  ],
})
export class DrugCatalogModule {}
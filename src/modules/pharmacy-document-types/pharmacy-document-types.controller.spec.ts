import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyDocumentTypesController } from './pharmacy-document-types.controller';
import { PharmacyDocumentTypesService } from './pharmacy-document-types.service';

describe('PharmacyDocumentTypesController', () => {
  let controller: PharmacyDocumentTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PharmacyDocumentTypesController],
      providers: [PharmacyDocumentTypesService],
    }).compile();

    controller = module.get<PharmacyDocumentTypesController>(PharmacyDocumentTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

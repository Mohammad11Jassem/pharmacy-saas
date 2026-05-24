import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyDocumentsController } from './pharmacy-documents.controller';
import { PharmacyDocumentsService } from './pharmacy-documents.service';

describe('PharmacyDocumentsController', () => {
  let controller: PharmacyDocumentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PharmacyDocumentsController],
      providers: [PharmacyDocumentsService],
    }).compile();

    controller = module.get<PharmacyDocumentsController>(PharmacyDocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

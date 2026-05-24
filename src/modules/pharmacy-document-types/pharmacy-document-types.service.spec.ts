import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyDocumentTypesService } from './pharmacy-document-types.service';

describe('PharmacyDocumentTypesService', () => {
  let service: PharmacyDocumentTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PharmacyDocumentTypesService],
    }).compile();

    service = module.get<PharmacyDocumentTypesService>(PharmacyDocumentTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

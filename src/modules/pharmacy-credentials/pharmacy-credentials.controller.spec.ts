import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyCredentialsController } from './pharmacy-credentials.controller';
import { PharmacyCredentialsService } from './pharmacy-credentials.service';

describe('PharmacyCredentialsController', () => {
  let controller: PharmacyCredentialsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PharmacyCredentialsController],
      providers: [PharmacyCredentialsService],
    }).compile();

    controller = module.get<PharmacyCredentialsController>(PharmacyCredentialsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

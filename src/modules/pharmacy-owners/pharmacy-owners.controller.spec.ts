import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyOwnersController } from './pharmacy-owners.controller';
import { PharmacyOwnersService } from './pharmacy-owners.service';

describe('PharmacyOwnersController', () => {
  let controller: PharmacyOwnersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PharmacyOwnersController],
      providers: [PharmacyOwnersService],
    }).compile();

    controller = module.get<PharmacyOwnersController>(PharmacyOwnersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

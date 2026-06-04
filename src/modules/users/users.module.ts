import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CodeGenerationModule } from '../../common/code-generation/code-generation.module';

@Module({
  imports: [CodeGenerationModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

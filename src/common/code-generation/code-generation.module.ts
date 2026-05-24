import { Module } from '@nestjs/common';
import { CodeGenerationService } from './code-generation.service';

@Module({
  providers: [CodeGenerationService],
  exports: [CodeGenerationService],
})
export class CodeGenerationModule {}


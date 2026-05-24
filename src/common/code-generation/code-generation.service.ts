import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { CodeType } from '../Enums/code-type.enum'; 
import { GenerateCodeOptions } from '../interfaces/generate-code-options.interface';
// export type CodeType = 'numeric' | 'alpha' | 'alphanumeric';

// export interface GenerateCodeOptions {
//   length?: number;
//   type?: CodeType;
//   prefix?: string;
//   separator?: string;
// }


@Injectable()
export class CodeGenerationService {
  generate(options: GenerateCodeOptions = {}): string {
    const {
      length = 6,
      type = CodeType.NUMERIC,
      prefix,
      separator = '-',
    } = options;

    const chars = this.getCharactersByType(type);

    let code = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = randomInt(0, chars.length);
      code += chars[randomIndex];
    }

    if (prefix) {
      return `${prefix}${separator}${code}`;
    }

    return code;
  }

  private getCharactersByType(type: CodeType): string {
    switch (type) {
      case CodeType.NUMERIC:
        return '0123456789';

      case CodeType.ALPHA:
        return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      case CodeType.ALPHANUMERIC:
        return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

      default:
        return '0123456789';
    }
  }
}
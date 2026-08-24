import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { pipeline } from 'stream/promises';

@Injectable()
export class BackupCryptoService {
  private getKey(): Buffer {
    const encodedKey = process.env.BACKUP_ENCRYPTION_KEY_BASE64?.trim();

    if (!encodedKey) {
      throw new Error('BACKUP_ENCRYPTION_KEY_BASE64 is required.');
    }

    const key = Buffer.from(encodedKey, 'base64');
    if (key.length !== 32) {
      throw new Error(
        'BACKUP_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes.',
      );
    }

    return key;
  }

  async encryptFile(inputPath: string, outputPath: string): Promise<void> {
    const key = this.getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    output.write(iv);
    await pipeline(input, cipher, output);

    const authTag = cipher.getAuthTag();
    await fs.promises.appendFile(outputPath, authTag);
  }
}

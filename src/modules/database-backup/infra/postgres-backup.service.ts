import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';

@Injectable()
export class PostgresBackupService {
  private readonly logger = new Logger(PostgresBackupService.name);

  private getPgBinary(command: 'pg_dump'): string {
    const fileName = process.platform === 'win32' ? `${command}.exe` : command;
    const binDir = process.env.PG_BIN_DIR?.trim();
    return binDir ? path.join(binDir, fileName) : fileName;
  }

  private getConnection() {
    const databaseUrl = process.env.DATABASE_URL?.trim();

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required for database backups.');
    }

    let parsed: URL;
    try {
      parsed = new URL(databaseUrl);
    } catch {
      throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL.');
    }

    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
      throw new Error('DATABASE_URL must use postgres:// or postgresql://.');
    }

    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    if (!database) {
      throw new Error('DATABASE_URL must include a database name.');
    }

    return {
      host: parsed.hostname,
      port: parsed.port || '5432',
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database,
    };
  }

  private run(
    executable: string,
    args: string[],
    password?: string,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const processRef = spawn(executable, args, {
        env: {
          ...process.env,
          ...(password ? { PGPASSWORD: password } : {}),
        },
      });

      let stdout = '';
      let stderr = '';

      processRef.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      processRef.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      processRef.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        reject(
          new Error(
            `${path.basename(executable)} exited with code ${code}. ${stderr || stdout}`,
          ),
        );
      });

      processRef.on('error', reject);
    });
  }

  async checkPgDumpVersion(): Promise<string> {
    const executable = this.getPgBinary('pg_dump');
    const { stdout, stderr } = await this.run(executable, ['--version']);
    return (stdout || stderr).trim();
  }

  async createCustomDump(outputPath: string): Promise<void> {
    const { host, port, user, password, database } = this.getConnection();
    const executable = this.getPgBinary('pg_dump');

    const args = [
      '-h',
      host,
      '-p',
      port,
      '-U',
      user,
      '-F',
      'c',
      '-Z',
      '6',
      '--no-owner',
      '--no-privileges',
      '-f',
      outputPath,
      database,
    ];

    this.logger.log(
      `Creating PostgreSQL custom dump for database "${database}" at ${host}:${port}.`,
    );

    await this.run(executable, args, password);
  }
}

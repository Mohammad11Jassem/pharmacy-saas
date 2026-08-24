import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { BackupCryptoService } from '../infra/backup-crypto.service';
import { GoogleDriveBackupService } from '../infra/google-drive-backup.service';
import { PostgresBackupService } from '../infra/postgres-backup.service';

interface BackupStatus {
  running: boolean;
  lastStartedAt?: string;
  lastFinishedAt?: string;
  lastSucceededAt?: string;
  lastFailedAt?: string;
  lastFileId?: string;
  lastFileName?: string;
  lastError?: string;
}

@Injectable()
export class DatabaseBackupService {
  private readonly logger = new Logger(DatabaseBackupService.name);
  private readonly status: BackupStatus = { running: false };

  constructor(
    private readonly postgres: PostgresBackupService,
    private readonly crypto: BackupCryptoService,
    private readonly drive: GoogleDriveBackupService,
  ) {}

  getStatus(): BackupStatus {
    return { ...this.status };
  }

  @Cron('0 2 * * *', {
    name: 'medixa-database-backup',
    timeZone: 'Asia/Damascus',
  })
  async runDailyBackup(): Promise<void> {
    if ((process.env.BACKUP_ENABLED ?? 'false').toLowerCase() !== 'true') {
      return;
    }

    try {
      await this.runBackup('daily', true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scheduled database backup failed: ${message}`);
    }
  }

  async runBackup(
    type: 'daily' = 'daily',
    skipIfRunning = false,
  ): Promise<{
    ok: true;
    fileId: string;
    fileName: string;
    dumpSizeBytes: number;
    encryptedSizeBytes: number;
  } | null> {
    if (this.status.running) {
      if (skipIfRunning) {
        this.logger.warn(
          'Database backup skipped because another backup is running.',
        );
        return null;
      }

      throw new ConflictException('A database backup is already running.');
    }

    this.status.running = true;
    this.status.lastStartedAt = new Date().toISOString();
    this.status.lastError = undefined;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `medixa-${type}-${timestamp}`;
    const tempDir =
      process.env.BACKUP_TEMP_DIR?.trim() || '/tmp/medixa-backups';

    await fs.promises.mkdir(tempDir, { recursive: true });

    const dumpPath = path.join(tempDir, `${baseName}.dump`);
    const encryptedPath = path.join(tempDir, `${baseName}.dump.enc`);

    try {
      const pgVersion = await this.postgres.checkPgDumpVersion();
      this.logger.log(`Database backup started (${pgVersion}).`);

      await this.postgres.createCustomDump(dumpPath);
      const dumpStats = await fs.promises.stat(dumpPath);

      await this.crypto.encryptFile(dumpPath, encryptedPath);
      const encryptedStats = await fs.promises.stat(encryptedPath);

      const folderName =
        process.env.DRIVE_BACKUP_FOLDER?.trim() || 'MediXa-DB-Backups';
      const folderId = await this.drive.ensureFolder(folderName);
      const fileName = path.basename(encryptedPath);
      const fileId = await this.drive.uploadFile(
        folderId,
        encryptedPath,
        fileName,
      );

      const retention = Number(process.env.RETENTION_DAILY ?? '7');
      await this.drive.applyRetention(folderId, retention);

      this.status.lastSucceededAt = new Date().toISOString();
      this.status.lastFileId = fileId;
      this.status.lastFileName = fileName;

      this.logger.log(
        `Database backup completed successfully: ${fileName} (Drive fileId=${fileId}).`,
      );

      return {
        ok: true,
        fileId,
        fileName,
        dumpSizeBytes: dumpStats.size,
        encryptedSizeBytes: encryptedStats.size,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.status.lastFailedAt = new Date().toISOString();
      this.status.lastError = message;
      this.logger.error(`Database backup failed: ${message}`);
      throw error;
    } finally {
      // await fs.promises.unlink(dumpPath).catch(() => undefined);
      // await fs.promises.unlink(encryptedPath).catch(() => undefined);
      await fs.promises.unlink(dumpPath).catch((): void => {
        return;
      });

      await fs.promises.unlink(encryptedPath).catch((): void => {
        return;
      });

      this.status.running = false;
      this.status.lastFinishedAt = new Date().toISOString();
    }
  }
}

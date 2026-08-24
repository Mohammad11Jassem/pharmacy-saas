import { Module } from '@nestjs/common';
import { DatabaseBackupController } from './database-backup.controller';
import { BackupCryptoService } from './infra/backup-crypto.service';
import { GoogleDriveBackupService } from './infra/google-drive-backup.service';
import { PostgresBackupService } from './infra/postgres-backup.service';
import { DatabaseBackupService } from './services/database-backup.service';

@Module({
  controllers: [DatabaseBackupController],
  providers: [
    DatabaseBackupService,
    PostgresBackupService,
    BackupCryptoService,
    GoogleDriveBackupService,
  ],
  exports: [DatabaseBackupService],
})
export class DatabaseBackupModule {}

import { Controller, Get, Post } from '@nestjs/common';
import { AccountType } from '../../generated/prisma/enums';
import { Auth } from '../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../iam/authentication/enums/auth-type.enum';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { DatabaseBackupService } from './services/database-backup.service';

@Auth(AuthType.Bearer)
@Roles(AccountType.ADMIN)
@Controller('database-backup')
export class DatabaseBackupController {
  constructor(private readonly backupService: DatabaseBackupService) {}

  @Post('run')
  runNow() {
    return this.backupService.runBackup('daily');
  }

  // @Get('status')
  // getStatus() {
  //   return this.backupService.getStatus();
  // }

  @Get('status')
  getStatus(): ReturnType<DatabaseBackupService['getStatus']> {
    return this.backupService.getStatus();
  }
}

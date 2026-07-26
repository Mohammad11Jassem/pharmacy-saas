import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Auth } from './iam/authentication/decorators/auth.decorator';
import { AuthType } from './iam/authentication/enums/auth-type.enum';
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Auth(AuthType.None)
  @Get("health-check")
  getHello(): string {
    return this.appService.getHello();
  }
}

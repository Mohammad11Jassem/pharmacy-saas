// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { Observable } from 'rxjs';
// import { ROLES_KEY } from '../../decorators/roles.decorator';

// @Injectable()
// export class RolesGuard implements CanActivate {

//   constructor(
//     private reflector: Reflector,
//   ) {}

//   canActivate(
//     context: ExecutionContext,
//   ): boolean | Promise<boolean> | Observable<boolean> {
//     const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
//       context.getHandler(),
//       context.getClass(),
//     ]);
//     if (!requiredRoles) return true;
    
//     const { user } = context.switchToHttp().getRequest();
//     // console.log("user in roles guard",user);
//      return requiredRoles.includes(user.accountType);
//     // return requiredRoles.some((role) => user.roles? === role);
//   }
// }

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../decorators/roles.decorator';
import { AccountType } from '../../../../generated/prisma/enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AccountType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User is not authenticated');
    }

    if (!user.accountType) {
      throw new ForbiddenException('User account type is missing');
    }

    const hasRole = requiredRoles.includes(user.accountType);

    if (!hasRole) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}
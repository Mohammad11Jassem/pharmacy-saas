import { SetMetadata } from "@nestjs/common";
import { AccountType } from "../../../generated/prisma/enums";
// import { UserRole } from "src/db/entities/user.entity";

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AccountType[]) => SetMetadata(ROLES_KEY, roles);
import { AccountType } from '../../../src/generated/prisma/client';

export const USER_ACCOUNT_ROLES = [
  AccountType.ADMIN,
  AccountType.PHARMACY_OWNER,
  AccountType.MEDICAL_TEAM,
] as const;

export const PHARMACY_ACCOUNT_ROLE = AccountType.PHARMACY;

export async function seedRoles() {
  console.log('Available AccountType roles:');
  console.table([
    {
      role: AccountType.ADMIN,
      storage: 'user_accounts',
      loginMethod: 'email + password',
    },
    {
      role: AccountType.PHARMACY_OWNER,
      storage: 'user_accounts + pharmacy_owners',
      loginMethod: 'email + password',
    },
    {
      role: AccountType.MEDICAL_TEAM,
      storage: 'user_accounts',
      loginMethod: 'email + password',
    },
    {
      role: AccountType.PHARMACY,
      storage: 'pharmacies + pharmacy_credentials',
      loginMethod: 'loginCode + password',
    },
  ]);
}
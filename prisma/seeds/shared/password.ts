import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const SEED_USER_PASSWORD = 'User@123456';
export const SEED_PHARMACY_PASSWORD = 'Pharmacy@123456';

export async function hashSeedPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
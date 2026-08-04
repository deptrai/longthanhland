// support/factories/user.factory.ts — faker-based user factory với overrides.
// Pattern: data-factories (API-first, overrides cho explicit intent).
import { faker } from '@faker-js/faker';

export type UserRole = 'user' | 'admin' | 'super-admin';

export interface TestUser {
  id: string;
  email: string;
  phone: string;
  password: string;
  displayName: string;
  role: UserRole;
  bio: string;
}

export const createUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: faker.string.uuid(),
  email: `e2e-${faker.string.alphanumeric(8)}@bdsai.vn`,
  phone: `0${faker.string.numeric(9)}`,
  password: 'E2eTest1234',
  displayName: faker.person.fullName(),
  role: 'user',
  bio: faker.lorem.sentence(),
  ...overrides,
});

export const createBuyer = (overrides: Partial<TestUser> = {}): TestUser =>
  createUser({ role: 'user', ...overrides });

export const createSeller = (overrides: Partial<TestUser> = {}): TestUser =>
  createUser({ role: 'user', ...overrides });

export const createAdmin = (overrides: Partial<TestUser> = {}): TestUser =>
  createUser({ role: 'admin', ...overrides });

export const createSuperAdmin = (overrides: Partial<TestUser> = {}): TestUser =>
  createUser({ role: 'super-admin', ...overrides });

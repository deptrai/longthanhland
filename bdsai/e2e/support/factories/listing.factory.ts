// support/factories/listing.factory.ts — faker-based listing factory với overrides.
import { faker } from '@faker-js/faker';

export type ListingStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'EXPIRED' | 'SOLD';
export type ListingType = 'sell' | 'rent';
export type PropertyType = 'land' | 'house' | 'apartment' | 'commercial' | 'project';

export interface TestListing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  area: number;
  listingType: ListingType;
  propertyType: PropertyType;
  province: string;
  district: string;
  ward: string | null;
  street: string | null;
  address: string;
  status: ListingStatus;
  bedrooms: number | null;
  bathrooms: number | null;
  floorCount: number | null;
  legalStatus: string | null;
}

const PROVINCES = ['Đồng Nai', 'TP. Hồ Chí Minh', 'Bình Dương', 'Bà Rịa - Vũng Tàu'];
const DISTRICTS_BY_PROVINCE: Record<string, string[]> = {
  'Đồng Nai': ['Long Thành', 'Nhơn Trạch', 'Trảng Bom', 'Biên Hòa'],
  'TP. Hồ Chí Minh': ['Quận 9', 'Thủ Đức', 'Quận 2', 'Bình Thạnh'],
  'Bình Dương': ['Dĩ An', 'Thuận An', 'Bến Cát'],
  'Bà Rịa - Vũng Tàu': ['Bà Rịa', 'Vũng Tàu', 'Đất Đỏ'],
};

export const createListing = (overrides: Partial<TestListing> = {}): TestListing => {
  const province = faker.helpers.arrayElement(PROVINCES);
  const district = faker.helpers.arrayElement(DISTRICTS_BY_PROVINCE[province] ?? ['Unknown']);
  return {
    id: faker.string.uuid(),
    sellerId: faker.string.uuid(),
    title: `Đất nền ${district} ${faker.number.int({ min: 50, max: 300 })}m²`,
    description: faker.lorem.paragraph({ min: 2, max: 4 }),
    price: faker.number.int({ min: 500_000_000, max: 5_000_000_000 }),
    area: faker.number.float({ min: 50, max: 300, multipleOf: 0.01 }),
    listingType: 'sell',
    propertyType: 'land',
    province,
    district,
    ward: null,
    street: null,
    address: `KP${faker.number.int({ min: 1, max: 9 })}, ${district}, ${province}`,
    status: 'PENDING',
    bedrooms: null,
    bathrooms: null,
    floorCount: null,
    legalStatus: 'Sổ đỏ',
    ...overrides,
  };
};

export const createDraftListing = (overrides: Partial<TestListing> = {}): TestListing =>
  createListing({ status: 'DRAFT', ...overrides });

export const createPendingListing = (overrides: Partial<TestListing> = {}): TestListing =>
  createListing({ status: 'PENDING', ...overrides });

export const createPublishedListing = (overrides: Partial<TestListing> = {}): TestListing =>
  createListing({ status: 'PUBLISHED', ...overrides });

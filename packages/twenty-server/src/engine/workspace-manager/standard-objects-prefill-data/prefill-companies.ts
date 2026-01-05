import { FieldActorSource } from 'twenty-shared/types';
import { type EntityManager } from 'typeorm';

export const VINHOMES_ID = 'c776ee49-f608-4a77-8cc8-6fe96ae1e43f';
export const NOVALAND_ID = 'f45ee421-8a3e-4aa5-a1cf-7207cc6754e1';
export const DATXANH_ID = '1f70157c-4ea5-4d81-bc49-e1401abfbb94';
export const PHULONG_ID = '9d5bcf43-7d38-4e88-82cb-d6d4ce638bf0';
export const KIENA_ID = '06290608-8bf0-4806-99ae-a715a6a93fad';

export const prefillCompanies = async (
  entityManager: EntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder()
    .insert()
    .into(`${schemaName}.company`, [
      'id',
      'name',
      'domainNamePrimaryLinkUrl',
      'addressAddressStreet1',
      'addressAddressStreet2',
      'addressAddressCity',
      'addressAddressState',
      'addressAddressPostcode',
      'addressAddressCountry',
      'employees',
      'position',
      'createdBySource',
      'createdByWorkspaceMemberId',
      'createdByName',
    ])
    .orIgnore()
    .values([
      {
        id: VINHOMES_ID,
        name: 'Vinhomes',
        domainNamePrimaryLinkUrl: 'https://vinhomes.com.vn',
        addressAddressStreet1: 'Số 7 Đường Bằng Lăng 1',
        addressAddressStreet2: 'Khu đô thị Vinhomes Riverside',
        addressAddressCity: 'Hà Nội',
        addressAddressState: null,
        addressAddressPostcode: '100000',
        addressAddressCountry: 'Việt Nam',
        employees: 5000,
        position: 1,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
      },
      {
        id: NOVALAND_ID,
        name: 'Novaland',
        domainNamePrimaryLinkUrl: 'https://novaland.com.vn',
        addressAddressStreet1: '65 Nguyễn Du',
        addressAddressStreet2: 'Quận 1',
        addressAddressCity: 'TP. Hồ Chí Minh',
        addressAddressState: null,
        addressAddressPostcode: '700000',
        addressAddressCountry: 'Việt Nam',
        employees: 3500,
        position: 2,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
      },
      {
        id: DATXANH_ID,
        name: 'Đất Xanh',
        domainNamePrimaryLinkUrl: 'https://datxanh.com.vn',
        addressAddressStreet1: '22 Nguyễn Thị Minh Khai',
        addressAddressStreet2: 'Quận 1',
        addressAddressCity: 'TP. Hồ Chí Minh',
        addressAddressState: null,
        addressAddressPostcode: '700000',
        addressAddressCountry: 'Việt Nam',
        employees: 4200,
        position: 3,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
      },
      {
        id: PHULONG_ID,
        name: 'Phú Long',
        domainNamePrimaryLinkUrl: 'https://phulong.com.vn',
        addressAddressStreet1: '36 Hoàng Cầu',
        addressAddressStreet2: 'Quận Đống Đa',
        addressAddressCity: 'Hà Nội',
        addressAddressState: null,
        addressAddressPostcode: '100000',
        addressAddressCountry: 'Việt Nam',
        employees: 2800,
        position: 4,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
      },
      {
        id: KIENA_ID,
        name: 'Kiến Á',
        domainNamePrimaryLinkUrl: 'https://kiena.com.vn',
        addressAddressStreet1: '123 Điện Biên Phủ',
        addressAddressStreet2: 'Quận Bình Thạnh',
        addressAddressCity: 'TP. Hồ Chí Minh',
        addressAddressState: null,
        addressAddressPostcode: '700000',
        addressAddressCountry: 'Việt Nam',
        employees: 2200,
        position: 5,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
      },
    ])
    .returning('*')
    .execute();
};

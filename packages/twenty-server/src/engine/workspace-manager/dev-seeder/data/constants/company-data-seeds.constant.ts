import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';

export const COMPANY_DATA_SEED_IDS = {
  ID_1: '20202020-a305-41e7-8c72-ba44072a4c58',
  ID_2: '20202020-a225-4b3d-a89c-7f6c30df998a',
  ID_3: '20202020-a8b0-422c-8fcf-5b7496f94975',
  ID_4: '20202020-aaf7-41d6-87a9-7add07bebfd8',
  ID_5: '20202020-a19d-422b-9cb2-5f8382a56877',
  ID_6: '20202020-a39c-4644-867d-e8e1851b3ee8',
  ID_7: '20202020-a0eb-4c51-aa03-c4cd2423d7cb',
  ID_8: '20202020-a9b5-48ec-97c0-dbbfcbe8df1b',
  ID_9: '20202020-a89d-44f9-ac9c-25e462460cb0',
  ID_10: '20202020-a377-4693-a2d9-89dc9188a1dc',
};

type CompanyDataSeed = {
  id: string;
  name: string;
  domainNamePrimaryLinkUrl: string;
  addressAddressCity: string;
  employees: number;
  linkedinLinkPrimaryLinkUrl: string;
  createdBySource: string;
  createdByWorkspaceMemberId: string;
  createdByName: string;
  accountOwnerId: string;
  position: number;
};

export const COMPANY_DATA_SEED_COLUMNS: (keyof CompanyDataSeed)[] = [
  'id',
  'name',
  'domainNamePrimaryLinkUrl',
  'addressAddressCity',
  'employees',
  'linkedinLinkPrimaryLinkUrl',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
  'accountOwnerId',
  'position',
];

// prettier-ignore
const COMPANY_DATA_SEEDS_RAW = [
  {
    id: COMPANY_DATA_SEED_IDS.ID_1,
    name: 'Vinhomes',
    domainNamePrimaryLinkUrl: 'vinhomes.com.vn',
    addressAddressCity: 'Hà Nội',
    employees: 5000,
    linkedinLinkPrimaryLinkUrl: 'https://linkedin.com/company/vinhomes',
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: COMPANY_DATA_SEED_IDS.ID_2,
    name: 'Novaland',
    domainNamePrimaryLinkUrl: 'novaland.com.vn',
    addressAddressCity: 'TP. Hồ Chí Minh',
    employees: 3500,
    linkedinLinkPrimaryLinkUrl: 'https://linkedin.com/company/novaland',
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: COMPANY_DATA_SEED_IDS.ID_3,
    name: 'Phú Long',
    domainNamePrimaryLinkUrl: 'phulong.com.vn',
    addressAddressCity: 'TP. Hồ Chí Minh',
    employees: 2800,
    linkedinLinkPrimaryLinkUrl: 'https://linkedin.com/company/phulong',
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: COMPANY_DATA_SEED_IDS.ID_4,
    name: 'Đất Xanh',
    domainNamePrimaryLinkUrl: 'datxanh.com.vn',
    addressAddressCity: 'TP. Hồ Chí Minh',
    employees: 4200,
    linkedinLinkPrimaryLinkUrl: 'https://linkedin.com/company/datxanh',
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: COMPANY_DATA_SEED_IDS.ID_5,
    name: 'Kiến Á',
    domainNamePrimaryLinkUrl: 'kiena.com.vn',
    addressAddressCity: 'TP. Hồ Chí Minh',
    employees: 2200,
    linkedinLinkPrimaryLinkUrl: 'https://linkedin.com/company/kiena',
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: COMPANY_DATA_SEED_IDS.ID_6,
    name: 'Tân Hoàng Minh',
    domainNamePrimaryLinkUrl: 'tanhoangminh.com.vn',
    addressAddressCity: 'Hà Nội',
    employees: 1800,
    linkedinLinkPrimaryLinkUrl: 'https://linkedin.com/company/tanhoangminh',
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: COMPANY_DATA_SEED_IDS.ID_7,
    name: 'Gamuda Land',
    domainNamePrimaryLinkUrl: 'gamudaland.com.vn',
    addressAddressCity: 'Đồng Nai',
    employees: 2500,
    linkedinLinkPrimaryLinkUrl: 'https://linkedin.com/company/gamudaland',
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: COMPANY_DATA_SEED_IDS.ID_8,
    name: 'Becamex IDC',
    domainNamePrimaryLinkUrl: 'becamex.com.vn',
    addressAddressCity: 'Bình Dương',
    employees: 1500,
    linkedinLinkPrimaryLinkUrl: 'https://linkedin.com/company/becamex',
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: COMPANY_DATA_SEED_IDS.ID_9,
    name: 'Hưng Thịnh',
    domainNamePrimaryLinkUrl: 'hungthinhcorp.com.vn',
    addressAddressCity: 'TP. Hồ Chí Minh',
    employees: 3000,
    linkedinLinkPrimaryLinkUrl: 'https://linkedin.com/company/hungthinhcorp',
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: COMPANY_DATA_SEED_IDS.ID_10,
    name: 'Thành Thái Group',
    domainNamePrimaryLinkUrl: 'thanhthaigroup.com.vn',
    addressAddressCity: 'Đồng Nai',
    employees: 1200,
    linkedinLinkPrimaryLinkUrl: 'https://linkedin.com/company/thanhthaigroup',
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
];

export const COMPANY_DATA_SEEDS = COMPANY_DATA_SEEDS_RAW.map((company, index) => ({
  ...company,
  position: index + 1,
}));

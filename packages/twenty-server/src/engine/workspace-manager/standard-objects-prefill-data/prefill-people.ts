import { FieldActorSource } from 'twenty-shared/types';
import { type EntityManager } from 'typeorm';

export const prefillPeople = async (
  entityManager: EntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder()
    .insert()
    .into(`${schemaName}.person`, [
      'nameFirstName',
      'nameLastName',
      'city',
      'emailsPrimaryEmail',
      'avatarUrl',
      'position',
      'createdBySource',
      'createdByWorkspaceMemberId',
      'createdByName',
      'phonesPrimaryPhoneNumber',
      'phonesPrimaryPhoneCallingCode',
      'companyId',
    ])
    .orIgnore()
    .values([
      {
        nameFirstName: 'Phạm',
        nameLastName: 'Nhật Vượng',
        city: 'Hà Nội',
        emailsPrimaryEmail: 'vuong@vinhomes.com.vn',
        avatarUrl:
          'https://twentyhq.github.io/placeholder-images/people/image-3.png',
        position: 1,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
        phonesPrimaryPhoneNumber: '912345678',
        phonesPrimaryPhoneCallingCode: '+84',
        companyId: VINHOMES_ID,
      },
      {
        nameFirstName: 'Bùi',
        nameLastName: 'Thành Nhơn',
        city: 'TP. Hồ Chí Minh',
        emailsPrimaryEmail: 'nhon@novaland.com.vn',
        avatarUrl:
          'https://twentyhq.github.io/placeholder-images/people/image-89.png',
        position: 2,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
        phonesPrimaryPhoneNumber: '923456789',
        phonesPrimaryPhoneCallingCode: '+84',
        companyId: NOVALAND_ID,
      },
      {
        nameFirstName: 'Lương',
        nameLastName: 'Trí Thìn',
        city: 'TP. Hồ Chí Minh',
        emailsPrimaryEmail: 'thin@datxanh.com.vn',
        avatarUrl:
          'https://twentyhq.github.io/placeholder-images/people/image-47.png',
        position: 3,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
        phonesPrimaryPhoneNumber: '934567890',
        phonesPrimaryPhoneCallingCode: '+84',
        companyId: DATXANH_ID,
      },
      {
        nameFirstName: 'Nguyễn',
        nameLastName: 'Văn Đạt',
        city: 'Hà Nội',
        emailsPrimaryEmail: 'dat@phulong.com.vn',
        avatarUrl:
          'https://twentyhq.github.io/placeholder-images/people/image-40.png',
        position: 4,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
        phonesPrimaryPhoneNumber: '945678901',
        phonesPrimaryPhoneCallingCode: '+84',
        companyId: PHULONG_ID,
      },
      {
        nameFirstName: 'Trần',
        nameLastName: 'Minh Hoàng',
        city: 'TP. Hồ Chí Minh',
        emailsPrimaryEmail: 'hoang@kiena.com.vn',
        avatarUrl:
          'https://twentyhq.github.io/placeholder-images/people/image-68.png',
        position: 5,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
        phonesPrimaryPhoneNumber: '956789012',
        phonesPrimaryPhoneCallingCode: '+84',
        companyId: KIENA_ID,
      },
    ])
    .returning('*')
    .execute();
};

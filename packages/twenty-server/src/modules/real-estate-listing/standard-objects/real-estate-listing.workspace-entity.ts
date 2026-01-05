import { FieldMetadataType } from 'src/engine/metadata-modules/field-metadata/field-metadata.constants';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import {
    WorkspaceField,
    msg,
} from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { STANDARD_OBJECT_ICONS } from 'src/engine/workspace-manager/workspace-sync-metadata/constants/standard-object-icons';

export const REAL_ESTATE_LISTING_STANDARD_FIELD_IDS = {
  id: 'id',
  title: 'title',
  description: 'description',
  price: 'price',
  area: 'area',
  bedrooms: 'bedrooms',
  bathrooms: 'bathrooms',
  address: 'address',
  city: 'city',
  district: 'district',
  propertyType: 'propertyType',
  status: 'status',
  images: 'images',
  createdAt: 'createdAt',
};

@WorkspaceEntity({
  standardId: 'realEstateListing',
  namePlural: 'realEstateListings',
  labelSingular: msg`Real Estate Listing`,
  labelPlural: msg`Real Estate Listings`,
  description: msg`A real estate listing`,
  icon: STANDARD_OBJECT_ICONS.opportunity,
})
export class RealEstateListingWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: REAL_ESTATE_LISTING_STANDARD_FIELD_IDS.title,
    type: FieldMetadataType.TEXT,
    label: msg`Title`,
    description: msg`The listing title`,
  })
  @WorkspaceIsNullable()
  title: string | null;

  @WorkspaceField({
    standardId: REAL_ESTATE_LISTING_STANDARD_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`The listing description`,
  })
  @WorkspaceIsNullable()
  description: string | null;

  @WorkspaceField({
    standardId: REAL_ESTATE_LISTING_STANDARD_FIELD_IDS.price,
    type: FieldMetadataType.NUMBER,
    label: msg`Price`,
    description: msg`The listing price`,
  })
  @WorkspaceIsNullable()
  price: number | null;

  @WorkspaceField({
    standardId: REAL_ESTATE_LISTING_STANDARD_FIELD_IDS.area,
    type: FieldMetadataType.NUMBER,
    label: msg`Area`,
    description: msg`The property area in square meters`,
  })
  @WorkspaceIsNullable()
  area: number | null;

  @WorkspaceField({
    standardId: REAL_ESTATE_LISTING_STANDARD_FIELD_IDS.bedrooms,
    type: FieldMetadataType.NUMBER,
    label: msg`Bedrooms`,
    description: msg`Number of bedrooms`,
  })
  @WorkspaceIsNullable()
  bedrooms: number | null;

  @WorkspaceField({
    standardId: REAL_ESTATE_LISTING_STANDARD_FIELD_IDS.bathrooms,
    type: FieldMetadataType.NUMBER,
    label: msg`Bathrooms`,
    description: msg`Number of bathrooms`,
  })
  @WorkspaceIsNullable()
  bathrooms: number | null;

  @WorkspaceField({
    standardId: REAL_ESTATE_LISTING_STANDARD_FIELD_IDS.address,
    type: FieldMetadataType.TEXT,
    label: msg`Address`,
    description: msg`The property address`,
  })
  @WorkspaceIsNullable()
  address: string | null;

  @WorkspaceField({
    standardId: REAL_ESTATE_LISTING_STANDARD_FIELD_IDS.city,
    type: FieldMetadataType.TEXT,
    label: msg`City`,
    description: msg`The city`,
  })
  @WorkspaceIsNullable()
  city: string | null;

  @WorkspaceField({
    standardId: REAL_ESTATE_LISTING_STANDARD_FIELD_IDS.district,
    type: FieldMetadataType.TEXT,
    label: msg`District`,
    description: msg`The district`,
  })
  @WorkspaceIsNullable()
  district: string | null;

  @WorkspaceField({
    standardId: REAL_ESTATE_LISTING_STANDARD_FIELD_IDS.propertyType,
    type: FieldMetadataType.TEXT,
    label: msg`Property Type`,
    description: msg`The property type`,
  })
  @WorkspaceIsNullable()
  propertyType: string | null;

  @WorkspaceField({
    standardId: REAL_ESTATE_LISTING_STANDARD_FIELD_IDS.status,
    type: FieldMetadataType.TEXT,
    label: msg`Status`,
    description: msg`The listing status`,
  })
  @WorkspaceIsNullable()
  status: string | null;

  @WorkspaceField({
    standardId: REAL_ESTATE_LISTING_STANDARD_FIELD_IDS.images,
    type: FieldMetadataType.TEXT,
    label: msg`Images`,
    description: msg`The listing images`,
  })
  @WorkspaceIsNullable()
  images: string | null;
}

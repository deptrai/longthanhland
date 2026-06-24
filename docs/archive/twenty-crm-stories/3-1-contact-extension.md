# Story 3.1: Contact Extension

Status: drafted

## Story

As an **Admin**,
I want to extend Contact with real estate fields,
so that I can track customer preferences.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-3.1.1 | Contact entity | Extended with new fields | Fields available in UI | Fields visible in contact form |
| AC-3.1.2 | Contact | Add budget range | Budget saved correctly | Query returns budget |
| AC-3.1.3 | Contact | Add preferred locations | Locations saved as array | Query returns locations |

---

## Backend Tasks

### BE-1: Understand Twenty's Person Entity (AC: 1)

> **IMPORTANT**: Twenty uses `Person` entity for contacts. We extend it, not create new.

**Research**: `packages/twenty-server/src/modules/person/standard-objects/person.workspace-entity.ts`

Twenty's Person already has:
- name, email, phone, company relation
- linkedinLink, xLink, jobTitle
- city, avatarUrl

We need to add real estate specific fields.

### BE-2: Create Contact Extension Fields (AC: 1-3)

> **[ASSUMPTION]**: Twenty allows extending standard objects via custom fields or workspace-level extensions.

**Option A: Use Twenty's Custom Fields (Recommended)**

Twenty supports adding custom fields via the UI or API. For programmatic extension:

**File**: `packages/twenty-server/src/modules/real-estate/extensions/person-extension.ts`

```typescript
import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

/**
 * Extension fields for Person entity (Contact)
 *
 * These fields are added to Twenty's standard Person object
 * to support real estate customer tracking.
 */
export const PERSON_EXTENSION_FIELDS = [
  {
    name: 'budgetMin',
    type: FieldMetadataType.NUMBER,
    label: msg`Budget Min`,
    description: msg`Minimum budget (VNĐ)`,
    icon: 'IconCurrencyDong',
    isNullable: true,
  },
  {
    name: 'budgetMax',
    type: FieldMetadataType.NUMBER,
    label: msg`Budget Max`,
    description: msg`Maximum budget (VNĐ)`,
    icon: 'IconCurrencyDong',
    isNullable: true,
  },
  {
    name: 'preferredLocations',
    type: FieldMetadataType.ARRAY,
    label: msg`Preferred Locations`,
    description: msg`List of preferred locations/districts`,
    icon: 'IconMapPin',
    isNullable: true,
  },
  {
    name: 'propertyType',
    type: FieldMetadataType.SELECT,
    label: msg`Property Type`,
    description: msg`Preferred property type`,
    icon: 'IconHome',
    options: [
      { value: 'LAND', label: 'Land', position: 0, color: 'green' },
      { value: 'HOUSE', label: 'House', position: 1, color: 'blue' },
      { value: 'APARTMENT', label: 'Apartment', position: 2, color: 'purple' },
      { value: 'COMMERCIAL', label: 'Commercial', position: 3, color: 'orange' },
    ],
    isNullable: true,
  },
  {
    name: 'leadSource',
    type: FieldMetadataType.SELECT,
    label: msg`Lead Source`,
    description: msg`How the customer found us`,
    icon: 'IconTarget',
    options: [
      { value: 'WEBSITE', label: 'Website', position: 0, color: 'blue' },
      { value: 'REFERRAL', label: 'Referral', position: 1, color: 'green' },
      { value: 'SOCIAL_MEDIA', label: 'Social Media', position: 2, color: 'purple' },
      { value: 'EVENT', label: 'Event', position: 3, color: 'orange' },
      { value: 'COLD_CALL', label: 'Cold Call', position: 4, color: 'gray' },
    ],
    isNullable: true,
  },
  {
    name: 'notes',
    type: FieldMetadataType.TEXT,
    label: msg`Notes`,
    description: msg`Additional notes about the customer`,
    icon: 'IconNotes',
    isNullable: true,
  },
];
```

### BE-3: Create Extension Service (AC: 1)

**File**: `packages/twenty-server/src/modules/real-estate/services/person-extension.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FieldMetadataEntity } from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { PERSON_EXTENSION_FIELDS } from '../extensions/person-extension';

@Injectable()
export class PersonExtensionService implements OnModuleInit {
  constructor(
    @InjectRepository(FieldMetadataEntity)
    private fieldMetadataRepository: Repository<FieldMetadataEntity>,
    @InjectRepository(ObjectMetadataEntity)
    private objectMetadataRepository: Repository<ObjectMetadataEntity>,
  ) {}

  async onModuleInit() {
    // Check if extension fields already exist
    // If not, create them programmatically
    // This runs on server startup
    await this.ensureExtensionFields();
  }

  private async ensureExtensionFields() {
    // Find Person object metadata
    const personObject = await this.objectMetadataRepository.findOne({
      where: { nameSingular: 'person' },
    });

    if (!personObject) {
      console.warn('Person object not found, skipping extension');
      return;
    }

    // Check and create each extension field
    for (const field of PERSON_EXTENSION_FIELDS) {
      const existingField = await this.fieldMetadataRepository.findOne({
        where: {
          objectMetadataId: personObject.id,
          name: field.name,
        },
      });

      if (!existingField) {
        // Create field via Twenty's metadata API
        // [ASSUMPTION: Using Twenty's internal field creation mechanism]
        console.log(`Creating extension field: ${field.name}`);
      }
    }
  }
}
```

---

## API Tasks

### API-1: Query Extended Contact (AC: 2, 3)

```graphql
query GetContactWithExtensions {
  person(id: "person-uuid") {
    id
    name { firstName lastName }
    email
    phone
    # Extension fields
    budgetMin
    budgetMax
    preferredLocations
    propertyType
    leadSource
    notes
  }
}
```

### API-2: Update Contact with Extensions (AC: 2, 3)

```graphql
mutation UpdateContactPreferences {
  updatePerson(id: "person-uuid", data: {
    budgetMin: 500000000
    budgetMax: 2000000000
    preferredLocations: ["District 9", "Thu Duc"]
    propertyType: LAND
    leadSource: REFERRAL
  }) {
    id
    budgetMin
    budgetMax
    preferredLocations
  }
}
```

---

## Frontend Tasks

### FE-1: Verify Fields in UI (AC: 1)

Twenty auto-generates UI for custom fields. Verify:

**Subtasks**:
- [ ] Open Person detail view
- [ ] Verify extension fields appear
- [ ] Test editing each field
- [ ] Verify data saves correctly

---

## Testing Tasks

### TEST-1: Extension Field Tests

```typescript
describe('Person Extension Fields', () => {
  it('should save budget range', async () => {
    const person = await createPerson({
      name: { firstName: 'Test', lastName: 'User' },
      budgetMin: 500000000,
      budgetMax: 2000000000,
    });

    expect(person.budgetMin).toBe(500000000);
    expect(person.budgetMax).toBe(2000000000);
  });

  it('should save preferred locations as array', async () => {
    const person = await createPerson({
      preferredLocations: ['District 9', 'Thu Duc', 'Binh Thanh'],
    });

    expect(person.preferredLocations).toHaveLength(3);
    expect(person.preferredLocations).toContain('District 9');
  });
});
```

---

## Definition of Done

- [ ] Extension fields defined
- [ ] Fields available in Person entity
- [ ] GraphQL queries work with new fields
- [ ] UI shows extension fields
- [ ] Tests passing

---

## Dev Notes

### Twenty Extension Pattern

Twenty supports extending standard objects via:
1. **Custom Fields (UI)**: Add via Settings > Data Model
2. **Metadata API**: Programmatically add fields
3. **Workspace-level**: Fields scoped to workspace

### References
- [Source: tech-spec-epic-3.md#Contact-Extension]
- [Twenty Person Entity](packages/twenty-server/src/modules/person/standard-objects/person.workspace-entity.ts)

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/extensions/person-extension.ts
- packages/twenty-server/src/modules/real-estate/services/person-extension.service.ts

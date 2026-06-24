# Story 2.7: File Gallery

Status: drafted

## Story

As an **Admin**,
I want to upload and view project images,
so that sales agents can see master plans and property photos.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-2.7.1 | Project | Upload master plan (<20MB) | Image stored | File accessible |
| AC-2.7.2 | Property | Upload images (<10MB each) | Images stored | Files accessible |
| AC-2.7.3 | Project detail | Viewed | Gallery displays | Images render |

---

## Backend Tasks

### BE-1: Verify Twenty's File Storage (AC: 1, 2)

> **IMPORTANT**: Twenty has built-in file storage. We just configure it.

**Twenty File Storage Config** (.env):
```bash
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=/app/storage/uploads

# Or for S3:
# STORAGE_TYPE=s3
# STORAGE_S3_BUCKET=twenty-files
# STORAGE_S3_REGION=ap-southeast-1
```

### BE-2: Add Master Plan Field to Project (AC: 1)

Already defined in Story 2.1 Project entity. Verify field exists:

```typescript
// In project.workspace-entity.ts
@WorkspaceField({
  type: FieldMetadataType.LINKS, // Or custom file type
  label: msg`Master Plan`,
  icon: 'IconMap',
})
@WorkspaceIsNullable()
masterPlanImage: string | null;
```

### BE-3: Add Images Field to Property (AC: 2)

```typescript
// In property.workspace-entity.ts
@WorkspaceField({
  type: FieldMetadataType.LINKS,
  label: msg`Property Images`,
  icon: 'IconPhoto',
})
@WorkspaceIsNullable()
images: string[] | null;
```

---

## Frontend Tasks

### FE-1: Create Image Gallery Component (AC: 3)

**File**: `packages/twenty-front/src/modules/real-estate/components/ImageGallery.tsx`

```tsx
import { useState } from 'react';
import styled from '@emotion/styled';

interface ImageGalleryProps {
  images: string[];
  title?: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!images || images.length === 0) {
    return <EmptyState>No images uploaded</EmptyState>;
  }

  return (
    <GalleryContainer>
      {title && <GalleryTitle>{title}</GalleryTitle>}

      <ThumbnailGrid>
        {images.map((url, index) => (
          <Thumbnail
            key={index}
            src={url}
            alt={`Image ${index + 1}`}
            onClick={() => setSelectedImage(url)}
          />
        ))}
      </ThumbnailGrid>

      {selectedImage && (
        <Lightbox onClick={() => setSelectedImage(null)}>
          <LightboxImage src={selectedImage} alt="Full size" />
          <CloseButton>×</CloseButton>
        </Lightbox>
      )}
    </GalleryContainer>
  );
};
```

### FE-2: Add Gallery to Project Detail (AC: 3)

```tsx
// In ProjectDetail page
<Section>
  <SectionTitle>Master Plan</SectionTitle>
  {project.masterPlanImage && (
    <MasterPlanImage src={project.masterPlanImage} alt="Master Plan" />
  )}
</Section>

<Section>
  <SectionTitle>Property Photos</SectionTitle>
  <ImageGallery images={project.properties.flatMap(p => p.images || [])} />
</Section>
```

---

## Testing Tasks

### TEST-1: File Upload Tests

```typescript
describe('File Gallery', () => {
  it('should upload master plan image', async () => {
    const project = await createProject({});
    const file = createTestFile('masterplan.jpg', 5 * 1024 * 1024); // 5MB

    await uploadFile(project.id, 'masterPlanImage', file);

    const updated = await getProject(project.id);
    expect(updated.masterPlanImage).toBeDefined();
  });

  it('should reject files over 20MB', async () => {
    const project = await createProject({});
    const file = createTestFile('large.jpg', 25 * 1024 * 1024); // 25MB

    await expect(
      uploadFile(project.id, 'masterPlanImage', file)
    ).rejects.toThrow('File too large');
  });
});
```

---

## Definition of Done

- [ ] File storage configured
- [ ] Master plan upload works
- [ ] Property images upload works
- [ ] Gallery component created
- [ ] Lightbox works
- [ ] Tests passing

---

## Dev Notes

### File Size Limits

| Field | Max Size |
|-------|----------|
| Master Plan | 20 MB |
| Property Image | 10 MB |

### Supported Formats
- JPEG, PNG, GIF, WebP

### References
- [Source: tech-spec-epic-2.md#File-Gallery]

---

## Dev Agent Record

### File List
- packages/twenty-front/src/modules/real-estate/components/ImageGallery.tsx
- Verify Twenty's file storage configuration

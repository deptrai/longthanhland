# Story 8.3.2: Post Listing Flow

Status: drafted

## Story

As a seller,
I want to post a new property listing,
so that buyers can discover my property.

## Acceptance Criteria

1. **Submit Listing with Validation**
   - Given verified seller logged in (Epic 8.2)
   - When I submit listing form
   - Then system validates all required fields:
     - title (required, max 100 chars)
     - description (required, max 2000 chars)
     - price (required, > 0)
     - area (required, > 0)
     - location, province, district (required)
     - propertyType, listingType (required)
   - And checks subscription limits (active listings vs tier limit)
   - And uploads images to Twenty's file storage
   - And creates listing with DRAFT status
   - And returns listing ID and success message

2. **Multi-step Form UI**
   - Given listing form displayed
   - When navigating through steps
   - Then includes 4 steps:
     - **Step 1**: Basic Info (title, description, listingType, propertyType)
     - **Step 2**: Property Details (price, area, bedrooms, bathrooms, floor, orientation)
     - **Step 3**: Location (address, province, district, ward, map picker)
     - **Step 4**: Images & Review (upload photos, preview, submit)
   - And progress indicator shows current step
   - And can navigate back/forward between steps
   - And data persists across steps

3. **Client-side Validation**
   - Given form fields
   - When user inputs data
   - Then React Hook Form validates in real-time:
     - Required fields highlighted if empty
     - Price/area must be positive numbers
     - Title max 100 characters
     - Description max 2000 characters
     - Vietnamese phone format for contact
   - And error messages displayed inline
   - And submit button disabled if validation fails

4. **Image Upload & Optimization**
   - Given user selects images
   - When images uploaded
   - Then validates:
     - File type: JPG, PNG, WebP only
     - File size: max 10MB per image
     - Max images based on subscription tier (FREE: 5, BASIC: 10, PRO: 20)
   - And resizes to 1920x1080 (maintains aspect ratio)
   - And optimizes quality (80% JPEG/WebP)
   - And generates thumbnails (400x300)
   - And uploads to Twenty's file storage
   - And shows upload progress
   - And allows reorder/delete images

5. **Auto-save Draft**
   - Given user filling form
   - When 30 seconds of inactivity
   - Then auto-saves draft to localStorage
   - And shows "Draft saved" notification
   - And restores draft on page reload
   - And clears draft after successful submission

6. **Location Autocomplete**
   - Given location input field
   - When user types address
   - Then Google Maps Autocomplete suggests addresses
   - And selecting suggestion auto-fills province, district, ward
   - And displays map with marker
   - And allows manual marker adjustment
   - And saves coordinates (lat, lng)

## Tasks / Subtasks

- [ ] **Task 1: Create Backend Mutation** (AC: #1)
  - [ ] Create `createPublicListing` mutation in `PublicListingResolver`:
    ```typescript
    @RequirePublicUserPermission(PublicUserPermission.POST_LISTING)
    @Mutation(() => PublicListing)
    async createPublicListing(
      @Args('data') data: CreatePublicListingInput,
      @CurrentUser() user: PublicUser,
    ): Promise<PublicListing> {
      // Check subscription limits
      await this.subscriptionLimitService.checkLimitOrThrow(user.id);

      // Validate input
      await this.validateListingInput(data);

      // Create listing
      const listing = await this.publicListingService.create(data, user.id);

      return listing;
    }
    ```
  - [ ] Create `CreatePublicListingInput` DTO with validation:
    ```typescript
    @InputType()
    export class CreatePublicListingInput {
      @Field()
      @IsNotEmpty()
      @MaxLength(100)
      title: string;

      @Field()
      @IsNotEmpty()
      @MaxLength(2000)
      description: string;

      @Field()
      @IsEnum(['SALE', 'RENT'])
      listingType: string;

      @Field()
      @IsEnum(['APARTMENT', 'HOUSE', 'LAND', 'VILLA', 'TOWNHOUSE', 'OFFICE'])
      propertyType: string;

      @Field()
      @IsPositive()
      price: number;

      @Field()
      @IsPositive()
      @Min(1)
      area: number;

      @Field()
      @IsNotEmpty()
      location: string;

      @Field()
      @IsNotEmpty()
      province: string;

      @Field()
      @IsNotEmpty()
      district: string;

      @Field({ nullable: true })
      ward?: string;

      @Field({ nullable: true })
      bedrooms?: number;

      @Field({ nullable: true })
      bathrooms?: number;

      @Field({ nullable: true })
      floor?: number;

      @Field({ nullable: true })
      orientation?: string;

      @Field(() => [String], { nullable: true })
      imageIds?: string[];
    }
    ```

- [ ] **Task 2: Implement Subscription Limit Check** (AC: #1)
  - [ ] Reuse `SubscriptionLimitService` from Story 8.2.4
  - [ ] Check active listings count before creation
  - [ ] Return clear error with upgrade path if limit exceeded

- [ ] **Task 3: Create Multi-step Form Component** (AC: #2)
  - [ ] Create `PostListingWizard` component:
    ```typescript
    const PostListingWizard = () => {
      const [currentStep, setCurrentStep] = useState(1);
      const [formData, setFormData] = useState<Partial<CreateListingInput>>({});
      const [createListing] = useMutation(CREATE_PUBLIC_LISTING);

      const steps = [
        { id: 1, title: 'Basic Info', component: BasicInfoStep },
        { id: 2, title: 'Property Details', component: PropertyDetailsStep },
        { id: 3, title: 'Location', component: LocationStep },
        { id: 4, title: 'Images & Review', component: ImagesReviewStep },
      ];

      const handleNext = (stepData: any) => {
        setFormData({ ...formData, ...stepData });
        if (currentStep < 4) {
          setCurrentStep(currentStep + 1);
        } else {
          handleSubmit();
        }
      };

      const handleBack = () => {
        if (currentStep > 1) {
          setCurrentStep(currentStep - 1);
        }
      };

      const handleSubmit = async () => {
        try {
          const result = await createListing({ variables: { data: formData } });
          toast.success('Listing created successfully!');
          navigate(`/listings/${result.data.createPublicListing.id}`);
        } catch (error) {
          toast.error(error.message);
        }
      };

      const CurrentStepComponent = steps[currentStep - 1].component;

      return (
        <div className="post-listing-wizard">
          <ProgressIndicator steps={steps} currentStep={currentStep} />
          <CurrentStepComponent
            data={formData}
            onNext={handleNext}
            onBack={handleBack}
          />
        </div>
      );
    };
    ```

- [ ] **Task 4: Create Step 1 - Basic Info** (AC: #2, #3)
  - [ ] Create `BasicInfoStep` component:
    ```typescript
    const BasicInfoStep = ({ data, onNext, onBack }) => {
      const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: data,
      });

      const onSubmit = (stepData) => {
        onNext(stepData);
      };

      return (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Title"
            {...register('title', {
              required: 'Title is required',
              maxLength: { value: 100, message: 'Max 100 characters' },
            })}
            error={errors.title?.message}
          />

          <Textarea
            label="Description"
            {...register('description', {
              required: 'Description is required',
              maxLength: { value: 2000, message: 'Max 2000 characters' },
            })}
            error={errors.description?.message}
            rows={6}
          />

          <Select
            label="Listing Type"
            {...register('listingType', { required: 'Required' })}
            options={[
              { value: 'SALE', label: 'For Sale' },
              { value: 'RENT', label: 'For Rent' },
            ]}
            error={errors.listingType?.message}
          />

          <Select
            label="Property Type"
            {...register('propertyType', { required: 'Required' })}
            options={[
              { value: 'APARTMENT', label: 'Apartment' },
              { value: 'HOUSE', label: 'House' },
              { value: 'LAND', label: 'Land' },
              { value: 'VILLA', label: 'Villa' },
              { value: 'TOWNHOUSE', label: 'Townhouse' },
              { value: 'OFFICE', label: 'Office' },
            ]}
            error={errors.propertyType?.message}
          />

          <Button type="submit">Next</Button>
        </form>
      );
    };
    ```

- [ ] **Task 5: Create Step 2 - Property Details** (AC: #2, #3)
  - [ ] Create `PropertyDetailsStep` with price, area, bedrooms, bathrooms, floor, orientation
  - [ ] Add number input validation (positive, min values)
  - [ ] Add currency formatting for price (VND)

- [ ] **Task 6: Create Step 3 - Location** (AC: #2, #6)
  - [ ] Create `LocationStep` component:
    ```typescript
    const LocationStep = ({ data, onNext, onBack }) => {
      const { register, handleSubmit, setValue, watch } = useForm({
        defaultValues: data,
      });
      const [mapCenter, setMapCenter] = useState({ lat: 10.8231, lng: 106.6297 }); // Ho Chi Minh City

      const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
        // Parse address components
        const addressComponents = place.address_components;
        const province = findComponent(addressComponents, 'administrative_area_level_1');
        const district = findComponent(addressComponents, 'administrative_area_level_2');
        const ward = findComponent(addressComponents, 'sublocality_level_1');

        setValue('location', place.formatted_address);
        setValue('province', province);
        setValue('district', district);
        setValue('ward', ward);

        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setMapCenter({ lat, lng });
          setValue('latitude', lat);
          setValue('longitude', lng);
        }
      };

      return (
        <form onSubmit={handleSubmit(onNext)}>
          <GooglePlacesAutocomplete
            onPlaceSelect={handlePlaceSelect}
            placeholder="Enter property address"
          />

          <Input
            label="Full Address"
            {...register('location', { required: 'Required' })}
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Province/City"
              {...register('province', { required: 'Required' })}
            />
            <Input
              label="District"
              {...register('district', { required: 'Required' })}
            />
            <Input
              label="Ward (optional)"
              {...register('ward')}
            />
          </div>

          <GoogleMap
            center={mapCenter}
            zoom={15}
            onMarkerDrag={(lat, lng) => {
              setValue('latitude', lat);
              setValue('longitude', lng);
            }}
          />

          <div className="flex gap-4">
            <Button type="button" onClick={onBack}>Back</Button>
            <Button type="submit">Next</Button>
          </div>
        </form>
      );
    };
    ```

- [ ] **Task 7: Create Step 4 - Images & Review** (AC: #2, #4)
  - [ ] Create `ImagesReviewStep` component:
    ```typescript
    const ImagesReviewStep = ({ data, onNext, onBack }) => {
      const [images, setImages] = useState<File[]>([]);
      const [uploading, setUploading] = useState(false);
      const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
      const { user } = useAuth();
      const tierLimits = SUBSCRIPTION_TIERS[user.subscriptionTier];

      const handleFileSelect = async (files: FileList) => {
        const validFiles = Array.from(files).filter(file => {
          // Validate file type
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error(`${file.name}: Invalid file type`);
            return false;
          }
          // Validate file size (10MB)
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`${file.name}: File too large (max 10MB)`);
            return false;
          }
          return true;
        });

        // Check tier limit
        if (images.length + validFiles.length > tierLimits.maxPhotos) {
          toast.error(`Max ${tierLimits.maxPhotos} photos for ${tierLimits.name} tier`);
          return;
        }

        setImages([...images, ...validFiles]);
      };

      const handleUpload = async () => {
        setUploading(true);
        const uploadedIds: string[] = [];

        for (const file of images) {
          try {
            // Resize and optimize
            const optimized = await optimizeImage(file, {
              maxWidth: 1920,
              maxHeight: 1080,
              quality: 0.8,
            });

            // Upload to Twenty's file storage
            const result = await uploadFile(optimized, (progress) => {
              setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            });

            uploadedIds.push(result.id);
          } catch (error) {
            toast.error(`Failed to upload ${file.name}`);
          }
        }

        setUploading(false);
        onNext({ ...data, imageIds: uploadedIds });
      };

      return (
        <div>
          <ImageUploader
            images={images}
            onFileSelect={handleFileSelect}
            onReorder={setImages}
            onDelete={(index) => setImages(images.filter((_, i) => i !== index))}
            maxImages={tierLimits.maxPhotos}
          />

          {uploading && (
            <UploadProgress progress={uploadProgress} />
          )}

          <ListingReview data={{ ...data, images }} />

          <div className="flex gap-4">
            <Button onClick={onBack} disabled={uploading}>Back</Button>
            <Button onClick={handleUpload} disabled={uploading || images.length === 0}>
              {uploading ? 'Uploading...' : 'Submit Listing'}
            </Button>
          </div>
        </div>
      );
    };
    ```

- [ ] **Task 8: Implement Image Optimization** (AC: #4)
  - [ ] Create `optimizeImage` utility:
    ```typescript
    export async function optimizeImage(
      file: File,
      options: { maxWidth: number; maxHeight: number; quality: number }
    ): Promise<File> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate new dimensions (maintain aspect ratio)
          let { width, height } = img;
          if (width > options.maxWidth || height > options.maxHeight) {
            const ratio = Math.min(options.maxWidth / width, options.maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: 'image/webp' }));
              } else {
                reject(new Error('Failed to optimize image'));
              }
            },
            'image/webp',
            options.quality
          );
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
    }
    ```

- [ ] **Task 9: Implement Auto-save Draft** (AC: #5)
  - [ ] Create `useAutoSaveDraft` hook:
    ```typescript
    export function useAutoSaveDraft(formData: any, key: string) {
      const [lastSaved, setLastSaved] = useState<Date | null>(null);

      useEffect(() => {
        const timer = setTimeout(() => {
          localStorage.setItem(key, JSON.stringify(formData));
          setLastSaved(new Date());
          toast.success('Draft saved', { duration: 2000 });
        }, 30000); // 30 seconds

        return () => clearTimeout(timer);
      }, [formData, key]);

      const loadDraft = useCallback(() => {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
      }, [key]);

      const clearDraft = useCallback(() => {
        localStorage.removeItem(key);
      }, [key]);

      return { lastSaved, loadDraft, clearDraft };
    }
    ```
  - [ ] Use in `PostListingWizard`
  - [ ] Show "Draft saved" notification
  - [ ] Restore draft on component mount
  - [ ] Clear draft after successful submission

- [ ] **Task 10: Integrate Google Maps API** (AC: #6)
  - [ ] Add Google Maps script to index.html
  - [ ] Create `GooglePlacesAutocomplete` component
  - [ ] Create `GoogleMap` component with draggable marker
  - [ ] Parse address components to extract province, district, ward
  - [ ] Save coordinates (latitude, longitude)

- [ ] **Task 11: Create Unit Tests**
  - [ ] Test mutation with valid/invalid data
  - [ ] Test subscription limit enforcement
  - [ ] Test image validation and optimization
  - [ ] Test form validation
  - [ ] Achieve >80% coverage

- [ ] **Task 12: Integration Testing**
  - [ ] Test complete listing creation flow
  - [ ] Test multi-step navigation
  - [ ] Test image upload and optimization
  - [ ] Test auto-save and restore
  - [ ] Test location autocomplete

- [ ] **Task 13: Manual Testing**
  - [ ] Create listing as FREE user (3 listings limit)
  - [ ] Create listing as PRO user (unlimited)
  - [ ] Upload various image formats and sizes
  - [ ] Test auto-save functionality
  - [ ] Test location autocomplete with Vietnamese addresses
  - [ ] Verify listing created with DRAFT status

## Dev Notes

### Architecture Context

**Multi-step Form Pattern**: Wizard with state management
- 4 steps: Basic Info → Property Details → Location → Images & Review
- Form data persists across steps
- Client-side validation with React Hook Form
- Auto-save to localStorage every 30 seconds

**Key Design Decisions**:
- DRAFT status on creation (requires admin approval)
- Subscription limits checked before creation
- Images optimized client-side before upload
- Location autocomplete with Google Maps API
- Auto-save prevents data loss

### Implementation Details

**Image Optimization**:
- Resize to max 1920x1080 (maintains aspect ratio)
- Convert to WebP format (better compression)
- Quality: 80% (balance size vs quality)
- Generate thumbnails: 400x300

**Subscription Limits**:
- FREE: 5 photos max
- BASIC: 10 photos max
- PRO: 20 photos max
- ENTERPRISE: Unlimited

**Auto-save Strategy**:
- Save to localStorage every 30 seconds
- Restore on page reload
- Clear after successful submission
- Show "Draft saved" notification

### Testing Strategy

**Unit Tests**: Mutation logic, validation, image optimization
**Integration Tests**: End-to-end listing creation flow
**Manual Tests**: UI interactions, image uploads, autocomplete

### References

- [Epic 8.3](../real-estate-platform/epics.md#story-832-post-listing-flow)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.3
- [Story 8.2.4](./8-2-4-subscription-tiers-rbac.md) - Subscription limits

### Success Criteria

**Definition of Done**:
- ✅ Backend mutation working with validation
- ✅ Subscription limits enforced
- ✅ Multi-step form UI complete
- ✅ Client-side validation working
- ✅ Image upload and optimization working
- ✅ Auto-save draft functionality working
- ✅ Location autocomplete integrated
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing successful

**Estimate**: 10 hours

## Dev Agent Record

### Context Reference
<!-- Story context XML will be added by story-context workflow -->

### Agent Model Used
<!-- To be filled by dev agent -->

### Debug Log References
<!-- To be filled by dev agent during implementation -->

### Completion Notes List
<!-- To be filled by dev agent after completion -->

### File List
<!-- To be filled by dev agent with NEW/MODIFIED/DELETED files -->

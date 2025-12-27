# Story 8.2.5: User Profile Management

Status: drafted

## Story

As a public user,
I want to view and update my profile information,
so that I can keep my account details current.

## Acceptance Criteria

1. **View Profile Information**
   - Given authenticated public user
   - When accessing profile page
   - Then display complete profile:
     - Basic info: fullName, email, phone, userType
     - Account info: subscriptionTier, verified status, memberSince
     - Statistics: totalListings, activeListings, responseRate
     - Profile photo (if uploaded)
   - And all fields displayed in read-only format initially
   - And "Edit Profile" button available

2. **Edit Basic Profile Fields**
   - Given profile edit mode
   - When updating editable fields
   - Then can modify:
     - fullName (text, max 100 chars)
     - profilePhoto (image upload, max 5MB)
     - userType (enum: BUYER, SELLER, BROKER)
   - And changes validated before saving
   - And success message shown on save
   - And profile refreshed with new data

3. **Change Sensitive Fields with Verification**
   - Given user wants to change phone number
   - When new phone submitted
   - Then triggers SMS verification flow
   - And new phone not saved until verified
   - And old phone remains active until verification complete
   - And user can cancel verification process

4. **Change Password with Current Password**
   - Given user wants to change password
   - When password change form submitted
   - Then requires current password for verification
   - And validates new password strength
   - And hashes new password with bcrypt
   - And invalidates all existing refresh tokens (force re-login)
   - And sends email notification about password change

5. **Profile Photo Upload**
   - Given user uploads profile photo
   - When image selected
   - Then validates file type (jpg, png, webp)
   - And validates file size (max 5MB)
   - And uploads to Twenty's file storage
   - And generates thumbnail (200x200)
   - And updates user profile with photo URL
   - And old photo deleted if exists

6. **Audit Log & Rate Limiting**
   - Given profile updates
   - When changes saved
   - Then audit log entry created with:
     - userId, timestamp, changedFields, oldValues, newValues
   - And rate limiting enforced: max 5 updates per hour
   - And suspicious activity logged
   - And admin notified of sensitive changes

## Tasks / Subtasks

- [ ] **Task 1: Create View Profile Query** (AC: #1)
  - [ ] Create `getPublicUserProfile` query:
    ```typescript
    @PublicUserAuth()
    @Query(() => PublicUserProfile)
    async getPublicUserProfile(
      @CurrentUser() user: PublicUser,
    ): Promise<PublicUserProfile> {
      return this.publicUserService.getProfile(user.id);
    }
    ```
  - [ ] Create `PublicUserProfile` DTO with all fields
  - [ ] Calculate computed fields:
    - totalListings: count all user's listings
    - activeListings: count APPROVED listings
    - responseRate: (inquiries responded within 24h / total) * 100
    - memberSince: user.createdAt formatted
  - [ ] Return profile with statistics

- [ ] **Task 2: Create Update Profile Mutation** (AC: #2)
  - [ ] Create `updatePublicUserProfile` mutation:
    ```typescript
    @PublicUserAuth()
    @Throttle(5, 3600) // 5 updates per hour
    @Mutation(() => PublicUserProfile)
    async updatePublicUserProfile(
      @Args('data') data: UpdatePublicUserProfileInput,
      @CurrentUser() user: PublicUser,
    ): Promise<PublicUserProfile> {
      return this.publicUserService.updateProfile(user.id, data);
    }
    ```
  - [ ] Create `UpdatePublicUserProfileInput` DTO:
    - fullName (optional, string, max 100)
    - userType (optional, enum)
    - profilePhotoId (optional, string UUID)
  - [ ] Validate input data
  - [ ] Update user record
  - [ ] Create audit log entry
  - [ ] Return updated profile

- [ ] **Task 3: Implement Phone Change with Verification** (AC: #3)
  - [ ] Create `requestPhoneChange` mutation:
    ```typescript
    @PublicUserAuth()
    @Mutation(() => PhoneChangeRequestOutput)
    async requestPhoneChange(
      @Args('newPhone') newPhone: string,
      @CurrentUser() user: PublicUser,
    ): Promise<PhoneChangeRequestOutput> {
      // Validate phone format
      // Check phone not already in use
      // Send SMS verification code to new phone
      // Store pending change in Redis
      return {
        success: true,
        message: 'Verification code sent to new phone',
      };
    }
    ```
  - [ ] Create `confirmPhoneChange` mutation:
    ```typescript
    @PublicUserAuth()
    @Mutation(() => PhoneChangeConfirmOutput)
    async confirmPhoneChange(
      @Args('code') code: string,
      @CurrentUser() user: PublicUser,
    ): Promise<PhoneChangeConfirmOutput> {
      // Verify code from Redis
      // Update user phone
      // Set phoneVerified = true
      // Create audit log
      // Send notification email
      return {
        success: true,
        newPhone: user.phone,
      };
    }
    ```
  - [ ] Store pending phone change in Redis:
    - Key: `phone_change:{userId}`
    - Value: `{newPhone, code, expiresAt}`
    - TTL: 10 minutes
  - [ ] Reuse SMS verification service from story 8.2.2

- [ ] **Task 4: Implement Password Change** (AC: #4)
  - [ ] Create `changePassword` mutation:
    ```typescript
    @PublicUserAuth()
    @Mutation(() => ChangePasswordOutput)
    async changePassword(
      @Args('currentPassword') currentPassword: string,
      @Args('newPassword') newPassword: string,
      @CurrentUser() user: PublicUser,
    ): Promise<ChangePasswordOutput> {
      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Validate new password strength
      this.validatePasswordStrength(newPassword);

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.publicUserService.update(user.id, {
        password: hashedPassword,
      });

      // Invalidate all refresh tokens (force re-login on other devices)
      await this.authService.invalidateAllUserTokens(user.id);

      // Send email notification
      await this.emailService.send({
        to: user.email,
        subject: 'Password Changed',
        template: 'password-changed',
        context: { fullName: user.fullName },
      });

      // Create audit log
      await this.auditLogService.log({
        userId: user.id,
        action: 'PASSWORD_CHANGED',
        timestamp: new Date(),
      });

      return {
        success: true,
        message: 'Password changed successfully. Please log in again.',
      };
    }
    ```
  - [ ] Validate password strength:
    - Min 8 characters
    - At least 1 uppercase, 1 lowercase, 1 number
    - Cannot be same as current password
  - [ ] Invalidate all refresh tokens for user
  - [ ] Send email notification

- [ ] **Task 5: Implement Profile Photo Upload** (AC: #5)
  - [ ] Create `uploadProfilePhoto` mutation:
    ```typescript
    @PublicUserAuth()
    @Mutation(() => UploadProfilePhotoOutput)
    async uploadProfilePhoto(
      @Args('file') file: Upload,
      @CurrentUser() user: PublicUser,
    ): Promise<UploadProfilePhotoOutput> {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid file type');
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('File size exceeds 5MB');
      }

      // Upload to Twenty's file storage
      const uploadedFile = await this.fileStorageService.upload(file);

      // Generate thumbnail
      const thumbnail = await this.imageService.generateThumbnail(
        uploadedFile.path,
        { width: 200, height: 200 }
      );

      // Delete old photo if exists
      if (user.profilePhotoId) {
        await this.fileStorageService.delete(user.profilePhotoId);
      }

      // Update user profile
      await this.publicUserService.update(user.id, {
        profilePhotoId: uploadedFile.id,
        profilePhotoUrl: uploadedFile.url,
        profileThumbnailUrl: thumbnail.url,
      });

      return {
        success: true,
        photoUrl: uploadedFile.url,
        thumbnailUrl: thumbnail.url,
      };
    }
    ```
  - [ ] Use Twenty's existing file storage service
  - [ ] Generate thumbnail with sharp library
  - [ ] Store photo URL in user profile
  - [ ] Delete old photo when new one uploaded

- [ ] **Task 6: Implement Audit Logging** (AC: #6)
  - [ ] Create `AuditLogService`:
    ```typescript
    @Injectable()
    export class AuditLogService {
      async logProfileChange(
        userId: string,
        changedFields: string[],
        oldValues: Record<string, any>,
        newValues: Record<string, any>,
      ): Promise<void> {
        await this.auditLogRepository.create({
          userId,
          action: 'PROFILE_UPDATED',
          changedFields,
          oldValues,
          newValues,
          timestamp: new Date(),
          ipAddress: this.requestContext.getIp(),
          userAgent: this.requestContext.getUserAgent(),
        });

        // Log sensitive changes
        const sensitiveFields = ['phone', 'email', 'password'];
        const hasSensitiveChange = changedFields.some(f =>
          sensitiveFields.includes(f)
        );

        if (hasSensitiveChange) {
          await this.notificationService.notifyAdmin({
            type: 'SENSITIVE_PROFILE_CHANGE',
            userId,
            fields: changedFields,
          });
        }
      }
    }
    ```
  - [ ] Store audit logs in database
  - [ ] Include IP address and user agent
  - [ ] Notify admin of sensitive changes
  - [ ] Implement audit log retention policy (90 days)

- [ ] **Task 7: Add Rate Limiting** (AC: #6)
  - [ ] Apply throttler to update mutation:
    ```typescript
    @Throttle(5, 3600) // 5 updates per hour
    @Mutation(() => PublicUserProfile)
    async updatePublicUserProfile(...)
    ```
  - [ ] Track update attempts in Redis:
    - Key: `profile_update:{userId}`
    - Increment on each update
    - TTL: 1 hour
  - [ ] Return 429 error if limit exceeded
  - [ ] Log rate limit violations

- [ ] **Task 8: Create Frontend Profile Page** (AC: #1, #2)
  - [ ] Create `ProfilePage` component:
    ```typescript
    const ProfilePage = () => {
      const { user } = useAuth();
      const [isEditing, setIsEditing] = useState(false);
      const { data: profile } = useQuery(GET_PROFILE);
      const [updateProfile] = useMutation(UPDATE_PROFILE);

      return (
        <div className="profile-page">
          <ProfileHeader user={profile} />

          {isEditing ? (
            <ProfileEditForm
              profile={profile}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <ProfileView
              profile={profile}
              onEdit={() => setIsEditing(true)}
            />
          )}

          <ProfileStats
            totalListings={profile.totalListings}
            activeListings={profile.activeListings}
            responseRate={profile.responseRate}
          />
        </div>
      );
    };
    ```
  - [ ] Create `ProfileEditForm` with React Hook Form
  - [ ] Add form validation
  - [ ] Handle loading and error states

- [ ] **Task 9: Implement Photo Upload UI** (AC: #5)
  - [ ] Create `ProfilePhotoUpload` component:
    ```typescript
    const ProfilePhotoUpload = ({ currentPhoto, onUpload }) => {
      const [uploading, setUploading] = useState(false);
      const [uploadPhoto] = useMutation(UPLOAD_PROFILE_PHOTO);

      const handleFileSelect = async (file: File) => {
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          toast.error('File size must be less than 5MB');
          return;
        }

        setUploading(true);
        try {
          const result = await uploadPhoto({ variables: { file } });
          onUpload(result.data.uploadProfilePhoto.photoUrl);
          toast.success('Photo uploaded successfully');
        } catch (error) {
          toast.error('Failed to upload photo');
        } finally {
          setUploading(false);
        }
      };

      return (
        <div className="photo-upload">
          <Avatar src={currentPhoto} size="large" />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            disabled={uploading}
          />
          {uploading && <Spinner />}
        </div>
      );
    };
    ```
  - [ ] Add image preview before upload
  - [ ] Show upload progress
  - [ ] Handle upload errors

- [ ] **Task 10: Implement Phone Change UI** (AC: #3)
  - [ ] Create `PhoneChangeModal`:
    ```typescript
    const PhoneChangeModal = ({ currentPhone, onClose }) => {
      const [step, setStep] = useState(1); // 1: Enter new phone, 2: Verify code
      const [newPhone, setNewPhone] = useState('');
      const [requestChange] = useMutation(REQUEST_PHONE_CHANGE);
      const [confirmChange] = useMutation(CONFIRM_PHONE_CHANGE);

      const handleRequestChange = async () => {
        await requestChange({ variables: { newPhone } });
        setStep(2);
      };

      const handleConfirmChange = async (code: string) => {
        await confirmChange({ variables: { code } });
        toast.success('Phone number updated successfully');
        onClose();
      };

      return (
        <Modal>
          {step === 1 && (
            <PhoneInput
              value={newPhone}
              onChange={setNewPhone}
              onSubmit={handleRequestChange}
            />
          )}
          {step === 2 && (
            <VerificationCodeInput
              phone={newPhone}
              onVerify={handleConfirmChange}
              onResend={handleRequestChange}
            />
          )}
        </Modal>
      );
    };
    ```
  - [ ] Add phone format validation
  - [ ] Show verification code input
  - [ ] Add resend code functionality

- [ ] **Task 11: Implement Password Change UI** (AC: #4)
  - [ ] Create `PasswordChangeForm`:
    ```typescript
    const PasswordChangeForm = () => {
      const { register, handleSubmit, watch, formState: { errors } } = useForm();
      const [changePassword] = useMutation(CHANGE_PASSWORD);

      const onSubmit = async (data) => {
        try {
          await changePassword({
            variables: {
              currentPassword: data.currentPassword,
              newPassword: data.newPassword,
            },
          });
          toast.success('Password changed. Please log in again.');
          // Redirect to login
          navigate('/login');
        } catch (error) {
          toast.error(error.message);
        }
      };

      return (
        <form onSubmit={handleSubmit(onSubmit)}>
          <input
            type="password"
            {...register('currentPassword', { required: true })}
            placeholder="Current Password"
          />

          <input
            type="password"
            {...register('newPassword', {
              required: true,
              minLength: 8,
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            })}
            placeholder="New Password"
          />

          <input
            type="password"
            {...register('confirmPassword', {
              validate: (value) =>
                value === watch('newPassword') || 'Passwords do not match',
            })}
            placeholder="Confirm New Password"
          />

          <PasswordStrengthIndicator password={watch('newPassword')} />

          <button type="submit">Change Password</button>
        </form>
      );
    };
    ```
  - [ ] Add password strength indicator
  - [ ] Validate password requirements
  - [ ] Handle errors (wrong current password, etc.)

- [ ] **Task 12: Create Unit Tests**
  - [ ] Test profile update:
    ```typescript
    describe('updatePublicUserProfile', () => {
      it('should update basic profile fields', async () => {
        const result = await service.updateProfile(userId, {
          fullName: 'New Name',
          userType: 'SELLER',
        });
        expect(result.fullName).toBe('New Name');
        expect(result.userType).toBe('SELLER');
      });

      it('should create audit log entry', async () => {
        await service.updateProfile(userId, { fullName: 'New Name' });
        const logs = await auditLogService.findByUser(userId);
        expect(logs[0].action).toBe('PROFILE_UPDATED');
        expect(logs[0].changedFields).toContain('fullName');
      });

      it('should enforce rate limiting', async () => {
        for (let i = 0; i < 5; i++) {
          await service.updateProfile(userId, { fullName: `Name ${i}` });
        }
        await expect(service.updateProfile(userId, { fullName: 'Name 6' }))
          .rejects.toThrow('Rate limit exceeded');
      });
    });
    ```
  - [ ] Test phone change flow
  - [ ] Test password change
  - [ ] Test photo upload
  - [ ] Achieve >80% coverage

- [ ] **Task 13: Integration Testing**
  - [ ] Test complete profile update flow
  - [ ] Test phone change with verification
  - [ ] Test password change with token invalidation
  - [ ] Test photo upload and deletion
  - [ ] Test audit logging
  - [ ] Test rate limiting

- [ ] **Task 14: Manual Testing**
  - [ ] Update profile information
  - [ ] Upload profile photo
  - [ ] Change phone number (verify SMS received)
  - [ ] Change password (verify forced logout)
  - [ ] Try to update 6 times in 1 hour (verify rate limit)
  - [ ] Check audit logs in database
  - [ ] Verify email notifications sent

## Dev Notes

### Architecture Context

**Profile Management Pattern**: Secure user data updates with verification
- Basic fields: Update immediately
- Sensitive fields (phone): Require verification
- Critical fields (password): Require current password + force re-login
- All changes: Audit logged

**Key Design Decisions**:
- Phone change requires SMS verification (security)
- Password change invalidates all tokens (security)
- Rate limiting prevents abuse (5 updates/hour)
- Audit logging for compliance and security
- Profile photo stored in Twenty's file storage

**Technology Stack**:
- NestJS with GraphQL
- bcrypt for password hashing
- Twenty's file storage service
- sharp for image processing
- React Hook Form for frontend

### Implementation Details

**Editable Fields**:
- Basic: fullName, userType, profilePhoto
- Sensitive: phone (requires verification)
- Critical: password (requires current password)
- Read-only: email, subscriptionTier, verified, memberSince

**Audit Log Structure**:
```typescript
{
  userId: string,
  action: 'PROFILE_UPDATED' | 'PASSWORD_CHANGED' | 'PHONE_CHANGED',
  changedFields: string[],
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  timestamp: Date,
  ipAddress: string,
  userAgent: string,
}
```

**Rate Limiting**:
- Profile updates: 5 per hour
- Phone change requests: 3 per hour
- Password changes: 3 per day

### Testing Strategy

**Unit Tests**: Service logic, validation, audit logging
**Integration Tests**: End-to-end profile update flows
**Manual Tests**: UI interactions, file uploads, verifications

### References

- [Epic 8.2](../real-estate-platform/epics.md#story-825-user-profile-management)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md)
- [Architecture](../real-estate-platform/architecture.md)

### Success Criteria

**Definition of Done**:
- ✅ Profile view page working
- ✅ Profile edit functionality working
- ✅ Phone change with verification working
- ✅ Password change with current password working
- ✅ Profile photo upload working
- ✅ Audit logging implemented
- ✅ Rate limiting enforced
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing successful

**Estimate**: 6 hours

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

import styled from '@emotion/styled';
import { useState } from 'react';
import { mockPublicUsers } from '../data/mock-data';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
  padding: 2rem;
`;

const MaxWidth = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1.5rem;
`;

const SubscriptionCard = styled.div`
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  color: white;
`;

const SubscriptionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const SubscriptionTitle = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
`;

const UpgradeButton = styled.button`
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
`;

const SubscriptionExpiry = styled.div`
  font-size: 0.875rem;
  opacity: 0.9;
`;

const Card = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1.5rem;
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: 500;
`;

const Input = styled.input`
  background-color: ${({ theme }) => theme.background.primary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.primary};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.blue};
  }

  &::placeholder {
    color: ${({ theme }) => theme.font.color.tertiary};
  }
`;

const ButtonGroup = styled.div`
  grid-column: 1 / -1;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background-color: ${({ theme, variant }) =>
    variant === 'secondary'
      ? theme.background.primary
      : theme.color.blue};
  color: ${({ theme, variant }) =>
    variant === 'secondary'
      ? theme.font.color.primary
      : 'white'};
  border: ${({ theme, variant }) =>
    variant === 'secondary'
      ? `1px solid ${theme.border.color.medium}`
      : 'none'};
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ theme, variant }) =>
      variant === 'secondary'
        ? theme.background.tertiary
        : theme.color.blue};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Divider = styled.div`
  height: 1px;
  background-color: ${({ theme }) => theme.border.color.medium};
  margin: 2rem 0;
`;

export const ProfilePage = () => {
  // Mock current user - in real implementation, this would come from auth context
  const currentUser = mockPublicUsers[0];

  const [profileData, setProfileData] = useState({
    fullName: currentUser.fullName,
    email: currentUser.email,
    phone: currentUser.phone,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleProfileChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setProfileData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handlePasswordChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setPasswordData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Mock API call
    setTimeout(() => {
      console.log('Profile updated:', profileData);
      setIsSaving(false);
    }, 1000);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Mock API call
    setTimeout(() => {
      console.log('Password updated');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsSaving(false);
    }, 1000);
  };

  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Container>
      <MaxWidth>
        <Title>My Profile</Title>

        <SubscriptionCard>
          <SubscriptionHeader>
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                Current Plan
              </div>
              <SubscriptionTitle>
                {currentUser.subscriptionTier} Subscription
              </SubscriptionTitle>
              {currentUser.subscriptionExpiry && (
                <SubscriptionExpiry>
                  Expires: {formatExpiryDate(currentUser.subscriptionExpiry)}
                </SubscriptionExpiry>
              )}
            </div>
            <UpgradeButton>Upgrade Plan</UpgradeButton>
          </SubscriptionHeader>
        </SubscriptionCard>

        <Card>
          <SectionTitle>Profile Information</SectionTitle>
          <Form onSubmit={handleProfileSubmit}>
            <FormGroup>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={profileData.fullName}
                onChange={handleProfileChange('fullName')}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={handleProfileChange('email')}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={profileData.phone}
                onChange={handleProfileChange('phone')}
              />
            </FormGroup>

            <ButtonGroup>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </ButtonGroup>
          </Form>

          <Divider />

          <SectionTitle>Change Password</SectionTitle>
          <Form onSubmit={handlePasswordSubmit}>
            <FormGroup style={{ gridColumn: '1 / -1' }}>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="••••••••"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange('currentPassword')}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={passwordData.newPassword}
                onChange={handlePasswordChange('newPassword')}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange('confirmPassword')}
              />
            </FormGroup>

            <ButtonGroup>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Password'}
              </Button>
            </ButtonGroup>
          </Form>
        </Card>
      </MaxWidth>
    </Container>
  );
};

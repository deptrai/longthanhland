import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
  padding: 2rem;
`;

const MaxWidth = styled.div`
  margin: 0 auto;
  max-width: 900px;
`;

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1.5rem;
`;

const Stepper = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
`;

const StepperContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Step = styled.div<{ active?: boolean; completed?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StepNumber = styled.div<{ active?: boolean; completed?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  background-color: ${({ theme, active, completed }) =>
    completed
      ? theme.color.green
      : active
        ? theme.color.blue
        : theme.background.tertiary};
  color: ${({ theme, active, completed }) =>
    active || completed ? theme.font.color.inverted : theme.font.color.tertiary};
`;

const StepLabel = styled.span<{ active?: boolean }>`
  color: ${({ theme, active }) =>
    active ? theme.font.color.primary : theme.font.color.tertiary};
  font-size: 0.875rem;
`;

const StepDivider = styled.div<{ completed?: boolean }>`
  flex: 1;
  height: 2px;
  background-color: ${({ theme, completed }) =>
    completed ? theme.color.blue : theme.border.color.medium};
  margin: 0 1rem;
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

const FormGroup = styled.div<{ fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  grid-column: ${({ fullWidth }) => (fullWidth ? '1 / -1' : 'auto')};
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

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.blue};
  }
`;

const Select = styled.select`
  background-color: ${({ theme }) => theme.background.primary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.primary};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.blue};
  }
`;

const TextArea = styled.textarea`
  background-color: ${({ theme }) => theme.background.primary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.primary};
  min-height: 120px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.blue};
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
    variant === 'secondary' ? theme.background.primary : theme.color.blue};
  color: ${({ theme, variant }) =>
    variant === 'secondary' ? theme.font.color.primary : 'white'};
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
      variant === 'secondary' ? theme.background.tertiary : theme.color.blue};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const PostListingPage = () => {
  const { t } = useLanguage();
  const theme = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    district: '',
    city: 'Ho Chi Minh City',
    bedrooms: '',
    bathrooms: '',
    area: '',
    propertyType: 'APARTMENT',
  });

  const handleChange =
    (field: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Listing data:', formData);
    // Navigate to dashboard after submission
    window.location.href = '/marketplace/dashboard';
  };

  return (
    <Container>
      <MaxWidth>
        <Title>{t('postListing.title')}</Title>

        <Stepper>
          <StepperContent>
            <Step active={currentStep === 1} completed={currentStep > 1}>
              <StepNumber
                active={currentStep === 1}
                completed={currentStep > 1}
              >
                1
              </StepNumber>
              <StepLabel active={currentStep === 1}>{t('postListing.stepBasic')}</StepLabel>
            </Step>
            <StepDivider completed={currentStep > 1} />
            <Step active={currentStep === 2} completed={currentStep > 2}>
              <StepNumber
                active={currentStep === 2}
                completed={currentStep > 2}
              >
                2
              </StepNumber>
              <StepLabel active={currentStep === 2}>{t('postListing.stepDetails')}</StepLabel>
            </Step>
            <StepDivider completed={currentStep > 2} />
            <Step active={currentStep === 3}>
              <StepNumber active={currentStep === 3}>3</StepNumber>
              <StepLabel active={currentStep === 3}>{t('postListing.stepImages')}</StepLabel>
            </Step>
          </StepperContent>
        </Stepper>

        <Card>
          <SectionTitle>
            {currentStep === 1 && t('postListing.basicInfo')}
            {currentStep === 2 && t('postListing.stepDetails')}
            {currentStep === 3 && t('postListing.stepImages')}
          </SectionTitle>

          <Form onSubmit={handleSubmit}>
            {currentStep === 1 && (
              <>
                <FormGroup fullWidth>
                  <Label htmlFor="title">{t('postListing.propertyTitle')} *</Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder={t('postListing.propertyTitlePlaceholder')}
                    value={formData.title}
                    onChange={handleChange('title')}
                    required
                  />
                </FormGroup>
                <FormGroup fullWidth>
                  <Label htmlFor="description">{t('postListing.description')} *</Label>
                  <TextArea
                    id="description"
                    placeholder={t('postListing.descriptionPlaceholder')}
                    value={formData.description}
                    onChange={handleChange('description')}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="price">{t('postListing.price')} *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="3500000000"
                    value={formData.price}
                    onChange={handleChange('price')}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="propertyType">{t('postListing.propertyType')} *</Label>
                  <Select
                    id="propertyType"
                    value={formData.propertyType}
                    onChange={handleChange('propertyType')}
                  >
                    <option value="APARTMENT">{t('categories.apartment')}</option>
                    <option value="HOUSE">{t('categories.house')}</option>
                    <option value="LAND">{t('categories.land')}</option>
                    <option value="VILLA">{t('categories.villa')}</option>
                  </Select>
                </FormGroup>
              </>
            )}

            {currentStep === 2 && (
              <>
                <FormGroup>
                  <Label htmlFor="bedrooms">{t('detail.bedrooms')} *</Label>
                  <Select
                    id="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleChange('bedrooms')}
                    required
                  >
                    <option value="">{t('common.select')}...</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5+</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="bathrooms">{t('detail.bathrooms')} *</Label>
                  <Select
                    id="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleChange('bathrooms')}
                    required
                  >
                    <option value="">{t('common.select')}...</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4+</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="area">{t('detail.area')} (m²) *</Label>
                  <Input
                    id="area"
                    type="number"
                    placeholder="120"
                    value={formData.area}
                    onChange={handleChange('area')}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="city">{t('detail.location')} (Thành phố) *</Label>
                  <Select
                    id="city"
                    value={formData.city}
                    onChange={handleChange('city')}
                  >
                    <option value="Ho Chi Minh City">Ho Chi Minh City</option>
                    <option value="Hanoi">Hanoi</option>
                    <option value="Da Nang">Da Nang</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="district">{t('detail.location')} (Quận) *</Label>
                  <Input
                    id="district"
                    type="text"
                    placeholder="District 7"
                    value={formData.district}
                    onChange={handleChange('district')}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="location">{t('detail.location')} (Địa chỉ) *</Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="123 Nguyen Van Linh"
                    value={formData.location}
                    onChange={handleChange('location')}
                    required
                  />
                </FormGroup>
              </>
            )}

            {currentStep === 3 && (
              <FormGroup fullWidth>
                <Label>{t('postListing.stepImages')}</Label>
                <div
                  style={{
                    border: `2px dashed ${theme.border.color.strong}`,
                    borderRadius: '8px',
                    padding: '3rem',
                    textAlign: 'center' as const,
                    color: theme.font.color.tertiary,
                  }}
                >
                  <p>Kéo thả hình ảnh vào đây hoặc click để chọn</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    (Tính năng tải ảnh sẽ được cập nhật trong phiên bản sau)
                  </p>
                </div>
              </FormGroup>
            )}

            <ButtonGroup>
              {currentStep > 1 && (
                <Button type="button" variant="secondary" onClick={handleBack}>
                  {t('postListing.previous')}
                </Button>
              )}
              {currentStep < 3 ? (
                <Button type="button" onClick={handleNext}>
                  {t('postListing.next')}
                </Button>
              ) : (
                <Button type="submit">{t('postListing.submit')}</Button>
              )}
            </ButtonGroup>
          </Form>
        </Card>
      </MaxWidth>
    </Container>
  );
};

import styled from '@emotion/styled';
import { useState } from 'react';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
  padding: 2rem;
`;

const MaxWidth = styled.div`
  max-width: 900px;
  margin: 0 auto;
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
  color: ${({ active, completed }) => (active || completed ? 'white' : '#888888')};
`;

const StepLabel = styled.span<{ active?: boolean }>`
  font-size: 0.875rem;
  color: ${({ theme, active }) =>
    active ? theme.font.color.primary : theme.font.color.tertiary};
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
  grid-column: ${({ fullWidth }) => (fullWidth ? '1 / -1' : 'auto')};
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
    variant === 'secondary' ? `1px solid ${theme.border.color.medium}` : 'none'};
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

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
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
        <Title>Post New Listing</Title>

        <Stepper>
          <StepperContent>
            <Step active={currentStep === 1} completed={currentStep > 1}>
              <StepNumber active={currentStep === 1} completed={currentStep > 1}>
                1
              </StepNumber>
              <StepLabel active={currentStep === 1}>Basic</StepLabel>
            </Step>
            <StepDivider completed={currentStep > 1} />
            <Step active={currentStep === 2} completed={currentStep > 2}>
              <StepNumber active={currentStep === 2} completed={currentStep > 2}>
                2
              </StepNumber>
              <StepLabel active={currentStep === 2}>Details</StepLabel>
            </Step>
            <StepDivider completed={currentStep > 2} />
            <Step active={currentStep === 3}>
              <StepNumber active={currentStep === 3}>3</StepNumber>
              <StepLabel active={currentStep === 3}>Images</StepLabel>
            </Step>
          </StepperContent>
        </Stepper>

        <Card>
          <SectionTitle>
            {currentStep === 1 && 'Basic Information'}
            {currentStep === 2 && 'Property Details'}
            {currentStep === 3 && 'Upload Images'}
          </SectionTitle>

          <Form onSubmit={handleSubmit}>
            {currentStep === 1 && (
              <>
                <FormGroup fullWidth>
                  <Label htmlFor="title">Property Title *</Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., Modern 3BR Apartment in District 7"
                    value={formData.title}
                    onChange={handleChange('title')}
                    required
                  />
                </FormGroup>
                <FormGroup fullWidth>
                  <Label htmlFor="description">Description *</Label>
                  <TextArea
                    id="description"
                    placeholder="Describe your property..."
                    value={formData.description}
                    onChange={handleChange('description')}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="price">Price (VND) *</Label>
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
                  <Label htmlFor="propertyType">Property Type *</Label>
                  <Select
                    id="propertyType"
                    value={formData.propertyType}
                    onChange={handleChange('propertyType')}
                  >
                    <option value="APARTMENT">Apartment</option>
                    <option value="HOUSE">House</option>
                    <option value="LAND">Land</option>
                    <option value="VILLA">Villa</option>
                  </Select>
                </FormGroup>
              </>
            )}

            {currentStep === 2 && (
              <>
                <FormGroup>
                  <Label htmlFor="bedrooms">Bedrooms *</Label>
                  <Select
                    id="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleChange('bedrooms')}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5+</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="bathrooms">Bathrooms *</Label>
                  <Select
                    id="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleChange('bathrooms')}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4+</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="area">Area (m²) *</Label>
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
                  <Label htmlFor="city">City *</Label>
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
                  <Label htmlFor="district">District *</Label>
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
                  <Label htmlFor="location">Street Address *</Label>
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
                <Label>Upload Images</Label>
                <div
                  style={{
                    border: '2px dashed #333333',
                    borderRadius: '8px',
                    padding: '3rem',
                    textAlign: 'center',
                    color: '#888888',
                  }}
                >
                  <p>Drag and drop images here or click to browse</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    (Image upload will be implemented in future stories)
                  </p>
                </div>
              </FormGroup>
            )}

            <ButtonGroup>
              {currentStep > 1 && (
                <Button type="button" variant="secondary" onClick={handleBack}>
                  Back
                </Button>
              )}
              {currentStep < 3 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="submit">Submit Listing</Button>
              )}
            </ButtonGroup>
          </Form>
        </Card>
      </MaxWidth>
    </Container>
  );
};

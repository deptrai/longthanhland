import styled from '@emotion/styled';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.background.primary};
  padding: 2rem;
`;

const Card = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 3rem;
  width: 100%;
  max-width: 480px;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 0.5rem;
  text-align: center;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.font.color.tertiary};
  text-align: center;
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
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

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -0.5rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.secondary};
  cursor: pointer;

  input[type='checkbox'] {
    cursor: pointer;
  }
`;

const ForgotLink = styled.a`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.blue};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Button = styled.button`
  background-color: ${({ theme }) => theme.color.blue};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.color.blue70};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.color.red};
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const LinkText = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.875rem;

  a {
    color: ${({ theme }) => theme.color.blue};
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.emailOrPhone.trim()) {
      newErrors.emailOrPhone = 'Email or phone is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Mock API call - in real implementation, this would call backend API
    setTimeout(() => {
      console.log('Login data:', formData);
      setIsSubmitting(false);
      // Navigate to dashboard after successful login
      navigate('/marketplace/dashboard');
    }, 1000);
  };

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Container>
      <Card>
        <Title>Welcome Back</Title>
        <Subtitle>Login to your account</Subtitle>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="emailOrPhone">Email or Phone *</Label>
            <Input
              id="emailOrPhone"
              type="text"
              placeholder="john@example.com or +84 123 456 789"
              value={formData.emailOrPhone}
              onChange={handleChange('emailOrPhone')}
            />
            {errors.emailOrPhone && (
              <ErrorMessage>{errors.emailOrPhone}</ErrorMessage>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange('password')}
            />
            {errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
          </FormGroup>

          <CheckboxContainer>
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange('rememberMe')}
              />
              Remember me
            </CheckboxLabel>
            <ForgotLink href="/marketplace/forgot-password">
              Forgot password?
            </ForgotLink>
          </CheckboxContainer>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </Button>
        </Form>

        <LinkText>
          Don't have an account? <a href="/marketplace/register">Sign up</a>
        </LinkText>
      </Card>
    </Container>
  );
};

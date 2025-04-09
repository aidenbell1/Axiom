import React from 'react';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useAuth } from '../../contexts/AuthContext';
import { useForm } from '../../utils/hooks';
import { 
  validationRules, 
  validateForm, 
  validatePassword 
} from '../../utils/validation';

import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const SignupPage: NextPage = () => {
  const { signup } = useAuth();
  const router = useRouter();

  const { 
    values, 
    errors, 
    isSubmitting, 
    handleChange, 
    handleSubmit 
  } = useForm(
    {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    async (formValues) => {
      try {
        // Ensure passwords match before submission
        if (formValues.password !== formValues.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        await signup(formValues.name, formValues.email, formValues.password);
        router.push('/dashboard');
      } catch (error) {
        // Error handling will be managed by the form hook
        console.error('Signup failed', error);
      }
    },
    (values) => {
      // Custom validation with password strength check
      const formErrors = validateForm(values, {
        name: [
          validationRules.required,
          validationRules.minLength(2)
        ],
        email: [
          validationRules.required,
          validationRules.email
        ],
        password: [
          validationRules.required,
          {
            validate: (value) => validatePassword(value).length === 0,
            message: 'Password does not meet complexity requirements'
          }
        ],
        confirmPassword: [
          validationRules.required
        ]
      });

      // Additional check for password match
      if (values.password !== values.confirmPassword) {
        formErrors.confirmPassword = ['Passwords must match'];
      }

      return formErrors;
    }
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card 
          title="Create Your Axiom Account"
          subtitle="Start your trading journey"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Full Name"
              type="text"
              name="name"
              value={values.name}
              onChange={handleChange}
              error={errors.name?.[0]}
              placeholder="John Doe"
              required
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={values.email}
              onChange={handleChange}
              error={errors.email?.[0]}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={values.password}
              onChange={handleChange}
              error={errors.password?.[0]}
              placeholder="Create a strong password"
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={values.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword?.[0]}
              placeholder="Repeat your password"
              required
            />

            <div className="text-sm text-gray-600">
              Password must:
              <ul className="list-disc list-inside">
                <li>Be at least 8 characters long</li>
                <li>Contain uppercase and lowercase letters</li>
                <li>Include a number</li>
                <li>Have a special character</li>
              </ul>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <span className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/auth/login" 
              className="font-medium text-primary hover:text-primary-600"
            >
              Log in
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
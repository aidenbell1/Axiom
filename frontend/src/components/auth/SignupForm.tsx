// src/components/auth/SignupForm.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';

interface SignupFormProps {
  redirectUrl?: string;
}

const SignupForm: React.FC<SignupFormProps> = ({ redirectUrl = '/dashboard' }) => {
  const [signupError, setSignupError] = useState<string | null>(null);
  const { register } = useAuth();
  const router = useRouter();

  // Signup validation schema
  const signupSchema = Yup.object().shape({
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    username: Yup.string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores')
      .required('Username is required'),
    full_name: Yup.string()
      .min(2, 'Full name must be at least 2 characters')
      .required('Full name is required'),
    password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      )
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Confirm password is required'),
    termsAccepted: Yup.boolean()
      .oneOf([true], 'You must accept the terms and conditions')
      .required('You must accept the terms and conditions'),
  });

  // Handle form submission
  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      const { confirmPassword, termsAccepted, ...userData } = values;
      
      await register(userData);
      router.push(redirectUrl);
    } catch (error: any) {
      setSignupError(error.message || 'Registration failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-neutral-900">Create an account</h2>
        <p className="text-neutral-600 mt-2">Join Axiom to start your quantitative trading journey</p>
      </div>

      {signupError && (
        <div className="mb-6 bg-danger-50 text-danger-700 p-3 rounded-md text-sm">
          {signupError}
        </div>
      )}

      <Formik
        initialValues={{
          email: '',
          username: '',
          full_name: '',
          password: '',
          confirmPassword: '',
          termsAccepted: false,
        }}
        validationSchema={signupSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                Email
              </label>
              <Field
                id="email"
                name="email"
                type="email"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your email address"
              />
              <ErrorMessage name="email" component="div" className="mt-1 text-sm text-danger-600" />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-neutral-700 mb-1">
                Username
              </label>
              <Field
                id="username"
                name="username"
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Choose a username"
              />
              <ErrorMessage name="username" component="div" className="mt-1 text-sm text-danger-600" />
            </div>

            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-neutral-700 mb-1">
                Full Name
              </label>
              <Field
                id="full_name"
                name="full_name"
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your full name"
              />
              <ErrorMessage name="full_name" component="div" className="mt-1 text-sm text-danger-600" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
                Password
              </label>
              <Field
                id="password"
                name="password"
                type="password"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Create a password"
              />
              <ErrorMessage name="password" component="div" className="mt-1 text-sm text-danger-600" />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-1">
                Confirm Password
              </label>
              <Field
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Confirm your password"
              />
              <ErrorMessage name="confirmPassword" component="div" className="mt-1 text-sm text-danger-600" />
            </div>

            <div className="flex items-center">
              <Field
                id="termsAccepted"
                name="termsAccepted"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
              />
              <label htmlFor="termsAccepted" className="ml-2 block text-sm text-neutral-700">
                I agree to the{' '}
                <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                  Privacy Policy
                </Link>
              </label>
            </div>
            <ErrorMessage name="termsAccepted" component="div" className="mt-1 text-sm text-danger-600" />

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </Form>
        )}
      </Formik>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary-600 hover:text-primary-500 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;
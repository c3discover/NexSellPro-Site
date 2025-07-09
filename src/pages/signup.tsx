import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase, upsertUserProfile } from '@/lib/supabase';

// TypeScript types for form data and errors
interface SignupForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  businessName?: string;
  howDidYouHear?: string;
}

interface FormError {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  businessName?: string;
  howDidYouHear?: string;
  general?: string;
}

const initialForm: SignupForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  businessName: '',
  howDidYouHear: ''
};

export default function SignupPage() {
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [errors, setErrors] = useState<FormError>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resent, setResent] = useState(false);

  // Clear errors when user starts typing
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined, general: undefined }));
  }

  // Validate form fields
  function validate(values: SignupForm): FormError {
    const errs: FormError = {};

    // Required fields
    if (!values.firstName?.trim()) {
      errs.firstName = 'First name is required.';
    }
    if (!values.lastName?.trim()) {
      errs.lastName = 'Last name is required.';
    }
    if (!values.email) {
      errs.email = 'Email is required.';
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
      errs.email = 'Enter a valid email address.';
    }
    if (!values.password) {
      errs.password = 'Password is required.';
    } else if (values.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password)) {
      errs.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number.';
    }
    if (!values.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (values.password !== values.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    return errs;
  }

  // Handle form submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setResent(false);
    const validation = validate(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`, // ✅ NEW
        },
      });
      if (error) {
        setErrors({ general: error.message || 'Signup failed. Please try again.' });
        setLoading(false);
        return;
      }

      // Store user profile data if signup was successful
      if (data.user) {
        try {
          await upsertUserProfile({
            user_id: data.user.id,
            first_name: form.firstName,
            last_name: form.lastName,
            business_name: form.businessName || undefined,
            how_did_you_hear: form.howDidYouHear || undefined,
          });
        } catch (profileError) {
          console.error('Error saving user profile:', profileError);
          // Don't fail the signup if profile save fails
        }
      }

      setSuccess(true);
      // Note: For signup, we don't redirect immediately since user needs to confirm email
      // The redirect will happen after email confirmation
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error. Please try again.';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  // Resend confirmation email
  async function handleResend() {
    setResent(false);
    setLoading(true);
    setErrors({});
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`, // ✅ NEW
        },
      });
      if (error) {
        setErrors({ general: error.message || 'Could not resend confirmation email.' });
      } else {
        setResent(true);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error. Please try again.';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Sign Up | NexSellPro</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
        <div className="card max-w-lg w-full mx-auto p-8 md:p-10 glass animate-fadeIn shadow-xl">
          <h1 className="text-3xl font-bold text-center mb-2 gradient-text">Create your NexSellPro account</h1>
          <p className="text-center text-gray-400 mb-6">Join thousands of sellers finding profitable products on Walmart Marketplace</p>
          {success ? (
            <div className="text-center">
              <div className="text-2xl mb-2 text-accent">Check your email, {form.firstName}!</div>
              <p className="text-gray-300 mb-4">We&rsquo;ve sent a confirmation link to <span className="font-semibold text-white">{form.email}</span>.<br />Click the link to finish signing up and access your dashboard.</p>
              {resent && <div className="text-green-400 text-sm mb-2">Confirmation email resent!</div>}
              {errors.general && <div className="text-red-400 text-sm mb-2">{errors.general}</div>}
              <button
                className="btn-primary w-full mb-2"
                onClick={handleResend}
                disabled={loading}
                type="button"
              >
                {loading ? 'Resending...' : 'Resend Email'}
              </button>
              <button
                className="btn-accent w-full"
                onClick={() => { setSuccess(false); setForm(initialForm); }}
                type="button"
              >
                Try Again
              </button>
              <div className="mt-6 text-gray-400 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-accent hover:underline hover-underline">Sign in</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-200 mb-1">First Name *</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.firstName ? 'border-red-500' : ''}`}
                    value={form.firstName}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    placeholder="John"
                  />
                  {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                </div>
                <div className="relative">
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-200 mb-1">Last Name *</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.lastName ? 'border-red-500' : ''}`}
                    value={form.lastName}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    placeholder="Doe"
                  />
                  {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email Field */}
              <div className="relative">
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.email ? 'border-red-500' : ''}`}
                  value={form.email}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  placeholder="john@example.com"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Business Name (Optional) */}
              <div className="relative">
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-200 mb-1">Business Name (Optional)</label>
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  autoComplete="organization"
                  className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.businessName ? 'border-red-500' : ''}`}
                  value={form.businessName}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="My Online Store"
                />
                {errors.businessName && <p className="text-red-400 text-xs mt-1">{errors.businessName}</p>}
              </div>

              {/* Password Fields */}
              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">Password *</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.password ? 'border-red-500' : ''}`}
                  value={form.password}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  placeholder="Create a strong password"
                />
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              </div>

              <div className="relative">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-1">Confirm Password *</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>

              {/* How did you hear about us */}
              <div className="relative">
                <label htmlFor="howDidYouHear" className="block text-sm font-medium text-gray-200 mb-1">How did you hear about us?</label>
                <select
                  id="howDidYouHear"
                  name="howDidYouHear"
                  className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.howDidYouHear ? 'border-red-500' : ''}`}
                  value={form.howDidYouHear}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Select an option</option>
                  <option value="google">Google Search</option>
                  <option value="social-media">Social Media</option>
                  <option value="youtube">YouTube</option>
                  <option value="friend">Friend/Colleague</option>
                  <option value="forum">Online Forum/Community</option>
                  <option value="advertisement">Advertisement</option>
                  <option value="other">Other</option>
                </select>
                {errors.howDidYouHear && <p className="text-red-400 text-xs mt-1">{errors.howDidYouHear}</p>}
              </div>
              {errors.general && <div className="text-red-500 text-sm text-center">{errors.general}</div>}
              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                )}
                {loading ? 'Signing up...' : 'Sign Up'}
              </button>
              <div className="mt-4 text-xs text-gray-400 text-center">
                By signing up, you agree to our{' '}
                <Link href="/terms" className="text-accent hover:underline hover-underline">Terms of Service</Link>.
              </div>
              <div className="mt-6 text-center text-gray-400 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-accent hover:underline hover-underline">Sign in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
} 
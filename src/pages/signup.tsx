import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';

// TypeScript types for form data and errors
interface SignupForm {
  email: string;
  password: string;
}

interface FormError {
  email?: string;
  password?: string;
  general?: string;
}

const initialForm: SignupForm = { email: '', password: '' };

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [errors, setErrors] = useState<FormError>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resent, setResent] = useState(false);

  // Clear errors when user starts typing
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined, general: undefined }));
  }

  // Validate form fields
  function validate(values: SignupForm): FormError {
    const errs: FormError = {};
    if (!values.email) {
      errs.email = 'Email is required.';
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
      errs.email = 'Enter a valid email address.';
    }
    if (!values.password) {
      errs.password = 'Password is required.';
    } else if (values.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
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
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        setErrors({ general: error.message || 'Signup failed. Please try again.' });
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch (err: any) {
      setErrors({ general: err.message || 'Unexpected error. Please try again.' });
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
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        setErrors({ general: error.message || 'Could not resend confirmation email.' });
      } else {
        setResent(true);
      }
    } catch (err: any) {
      setErrors({ general: err.message || 'Unexpected error. Please try again.' });
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
        <div className="card max-w-md w-full mx-auto p-8 md:p-10 glass animate-fadeIn shadow-xl">
          <h1 className="text-3xl font-bold text-center mb-2 gradient-text">Create your NexSellPro account</h1>
          <p className="text-center text-gray-400 mb-6">Sign up to get started. It's fast and easy!</p>
          {success ? (
            <div className="text-center">
              <div className="text-2xl mb-2 text-accent">Check your email!</div>
              <p className="text-gray-300 mb-4">We've sent a confirmation link to <span className="font-semibold text-white">{form.email}</span>.<br />Click the link to finish signing up and access your dashboard.</p>
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
                <a href="/login" className="text-accent hover:underline hover-underline">Sign in</a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition ${errors.email ? 'border-red-500' : ''}`}
                  value={form.email}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition ${errors.password ? 'border-red-500' : ''}`}
                  value={form.password}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
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
                <a href="/terms" className="text-accent hover:underline hover-underline">Terms of Service</a>.
              </div>
              <div className="mt-6 text-center text-gray-400 text-sm">
                Already have an account?{' '}
                <a href="/login" className="text-accent hover:underline hover-underline">Sign in</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
} 
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// TypeScript types for form data and errors
interface LoginForm {
  email: string;
  password: string;
}

interface FormError {
  email?: string;
  password?: string;
  general?: string;
}

const initialForm: LoginForm = { email: '', password: '' };

// Error Boundary Component
class LoginErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Login page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
          <div className="card max-w-md w-full mx-auto p-8 md:p-10 glass animate-fadeIn shadow-xl">
            <h1 className="text-2xl font-bold text-center mb-4 text-red-400">Something went wrong</h1>
            <p className="text-center text-gray-400 mb-6">
              We encountered an error while loading the login page. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function LoginPage() {
  const [form, setForm] = useState<LoginForm>(initialForm);
  const [errors, setErrors] = useState<FormError>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Clear errors when user starts typing
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined, general: undefined }));
  }

  // Validate form fields
  function validate(values: LoginForm): FormError {
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

  // Handle form submit with proper error handling
  async function handleSubmit(e: React.FormEvent | React.MouseEvent) {
    // Prevent default form submission
    if (e.type === 'submit') {
      e.preventDefault();
    }

    try {
      setErrors({});
      const validation = validate(form);
      if (Object.keys(validation).length > 0) {
        setErrors(validation);
        return;
      }

      setLoading(true);
      setErrors({});

      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) {
        console.error("Login failed:", error.message);
        
        // Provide more user-friendly error messages
        let userFriendlyError = error.message;
        
        if (error.message.includes('Invalid login credentials')) {
          userFriendlyError = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          userFriendlyError = 'Please check your email and click the confirmation link before signing in.';
        } else if (error.message.includes('Too many requests')) {
          userFriendlyError = 'Too many login attempts. Please wait a moment before trying again.';
        }
        
        setErrors({ general: userFriendlyError });
        setLoading(false);
        return;
      }

      if (data.user && data.session) {
        // Force refresh the session to ensure it's properly synced
        try {
          const { error: refreshError } = await supabase.auth.getUser();
          
          if (refreshError) {
            console.error("Error refreshing user:", refreshError);
          }
        } catch (err) {
          console.error("Session refresh failed:", err);
        }
        
        // Small delay to ensure session is set
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Continue with redirect logic...
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect');
        
        if (redirectTo && redirectTo.includes('dashboard')) {
          const url = new URL(decodeURIComponent(redirectTo));
          window.location.href = url.pathname;
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        console.error("Login succeeded but no session data!");
        setErrors({ general: "Login succeeded but session was not created. Please try again." });
        setLoading(false);
      }
    } catch (error) {
      console.error("Unexpected error during login:", error);
      setErrors({
        general: error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      });
      setLoading(false);
    }
  }

  // Let middleware handle authentication checks
  React.useEffect(() => {
    // Authentication check handled by middleware
  }, []);

  return (
    <LoginErrorBoundary>
      <Head>
        <title>Login | NexSellPro</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
        <div className="card max-w-md w-full mx-auto p-8 md:p-10 glass animate-fadeIn shadow-xl">
          <h1 className="text-3xl font-bold text-center mb-2 gradient-text">Sign in to NexSellPro</h1>
          <p className="text-center text-gray-400 mb-6">Welcome back! Enter your details to continue.</p>
          <form className="space-y-5">
            <div className="relative">
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">Email</label>
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
                placeholder="Enter your email"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`w-full px-4 py-3 pr-12 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.password ? 'border-red-500' : ''}`}
                  value={form.password}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors z-20"
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>
            {/* Add this after the password input div */}
            <div className="text-right">
              <Link href="/reset-password-request" className="text-sm text-accent hover:underline">
                Forgot your password?
              </Link>
            </div>
            {errors.general && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm text-center">{errors.general}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="my-6 flex items-center justify-center">
            <span className="h-px w-16 bg-slate-700" />
            <span className="mx-3 text-gray-400 text-sm">or</span>
            <span className="h-px w-16 bg-slate-700" />
          </div>
          <button
            className="btn-accent w-full flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
            disabled
            title="Google login coming soon!"
          >
            <svg className="h-5 w-5" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C36.68 2.7 30.77 0 24 0 14.82 0 6.73 5.8 2.69 14.09l7.98 6.19C12.13 13.13 17.56 9.5 24 9.5z" /><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.6C43.98 37.13 46.1 31.3 46.1 24.55z" /><path fill="#FBBC05" d="M9.67 28.68A14.5 14.5 0 019.5 24c0-1.62.28-3.19.77-4.68l-7.98-6.19A23.94 23.94 0 000 24c0 3.93.94 7.65 2.69 10.87l7.98-6.19z" /><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.15 15.9-5.85l-7.19-5.6c-2.01 1.35-4.6 2.16-8.71 2.16-6.44 0-11.87-3.63-13.33-8.59l-7.98 6.19C6.73 42.2 14.82 48 24 48z" /></g></svg>
            Sign in with Google <span className="ml-2 text-xs">(Coming Soon)</span>
          </button>
          <div className="mt-6 text-center text-gray-400 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-accent hover:underline hover-underline">Sign up</Link>
          </div>
        </div>
      </div>
    </LoginErrorBoundary>
  );
} 
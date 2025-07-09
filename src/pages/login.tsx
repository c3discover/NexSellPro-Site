import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase, getCurrentUser } from '@/lib/supabase';

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
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>(initialForm);
  const [errors, setErrors] = useState<FormError>({});
  const [loading, setLoading] = useState(false);

  // Debug logging at component mount
  React.useEffect(() => {
    console.log('Login page loaded successfully');
  }, []);

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
    console.log('Button clicked, starting login...');
    
    // Prevent default form submission
    if (e.type === 'submit') {
      e.preventDefault();
    }

    try {
      setErrors({});
      const validation = validate(form);
      if (Object.keys(validation).length > 0) {
        console.log('Form validation failed:', validation);
        setErrors(validation);
        return;
      }

      setLoading(true);
      setErrors({});

      console.log('Attempting login with email:', form.email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) {
        console.error("Login failed:", error.message);
        setErrors({ general: error.message });
        setLoading(false);
        return;
      }

      if (data.user && data.session) {
        // Detailed debugging
        console.log("=== LOGIN SUCCESS DEBUG ===");
        console.log("1. User email:", data.user.email);
        console.log("2. Session exists:", !!data.session);
        console.log("3. Session access token:", data.session?.access_token ? "Present" : "Missing");
        console.log("4. Current URL:", window.location.href);
        console.log("5. Window origin:", window.location.origin);
        
        // Check for redirect parameter
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect');
        console.log("6. Redirect param:", redirectTo);
        
        // Method 1: Try immediate redirect with replace
        console.log("7. Attempting redirect with location.replace...");
        
        try {
          // Give Supabase a moment to properly set cookies
          await new Promise(resolve => setTimeout(resolve, 200));
          
          if (redirectTo && redirectTo.includes('dashboard')) {
            const decodedUrl = decodeURIComponent(redirectTo);
            console.log("8. Decoded redirect URL:", decodedUrl);
            
            // Extract just the pathname if it's a full URL
            const url = new URL(decodedUrl);
            console.log("9. Redirecting to pathname:", url.pathname);
            window.location.pathname = url.pathname;
          } else {
            console.log("10. No redirect param, going directly to /dashboard");
            // Force navigation to dashboard
            window.location.pathname = '/dashboard';
          }
        } catch (error) {
          console.error("11. Redirect error:", error);
          console.log("12. Fallback: Forcing reload to dashboard");
          
          // Method 2: Brute force approach
          window.location.href = window.location.origin + '/dashboard';
        }
        
        // Keep loading state - don't set to false
        console.log("13. Redirect initiated, keeping loading state...");
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

  // Redirect if already logged in
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          console.log('User already authenticated, redirecting to dashboard');
          router.replace('/dashboard');
        }
      } catch (error) {
        console.error("Error checking authentication status:", error);
        // Don't show error to user for auth check failures
      }
    };

    checkAuth();
  }, [router]);

  // Add this useEffect to check session state on mount
  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Current session on login page:", session ? "Active" : "None");
      if (session) {
        console.log("Already logged in, redirecting to dashboard");
        window.location.pathname = '/dashboard';
      }
    };
    checkSession();
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
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.password ? 'border-red-500' : ''}`}
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                required
                placeholder="Enter your password"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
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
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { ensureSessionPersistence } from '@/lib/auth-helpers';

/**
 * Login Flow and States Documentation:
 * 
 * This component handles user authentication with the following flow:
 * 1. User enters email/password
 * 2. Form validation occurs (client-side)
 * 3. Credentials are sent to Supabase for verification
 * 4. Based on response, user is either:
 *    - Redirected to dashboard (success)
 *    - Shown specific error message (failure)
 *    - Prompted to confirm email (if not confirmed)
 * 
 * Possible States:
 * - idle: Initial state, form ready for input
 * - validating: Client-side validation in progress
 * - checking: Credentials being verified with Supabase
 * - logging: User authenticated, creating session and redirecting
 * - error: Various error states with specific messages
 * - emailNotConfirmed: User needs to confirm email address
 * - tooManyAttempts: Rate limiting applied, user must wait
 * - networkError: Connection issues, user should retry
 * 
 * Error Handling:
 * - Email not confirmed: Shows resend confirmation option
 * - Invalid credentials: Generic message for security
 * - Too many attempts: Rate limiting message
 * - Network errors: Connection issue message
 * - Unexpected errors: Generic fallback message
 */

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

// Loading state types for better UX
type LoadingState = 'idle' | 'validating' | 'checking' | 'logging' | 'resending' | 'establishing' | 'redirecting';

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
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [redirectAttempts, setRedirectAttempts] = useState(0);

  /**
   * Handles input changes and clears related errors
   * @param e - Input change event
   */
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined, general: undefined }));
    setEmailNotConfirmed(false); // Clear email confirmation state when user types
  }

  /**
   * Validates form fields and returns validation errors
   * @param values - Form data to validate
   * @returns Object containing validation errors
   */
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

  /**
   * Resends email confirmation to the user
   * @param email - Email address to send confirmation to
   */
  async function handleResendConfirmation(email: string) {
    try {
      setLoadingState('resending');
      setErrors({});

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        console.error("Resend confirmation failed:", error);
        setErrors({ 
          general: error.message.includes('Too many requests') 
            ? 'Too many resend attempts. Please wait a moment before trying again.'
            : 'Failed to resend confirmation email. Please try again.'
        });
      } else {
        setErrors({ 
          general: 'Confirmation email sent! Please check your inbox and click the confirmation link.'
        });
        setEmailNotConfirmed(false);
      }
    } catch (error) {
      console.error("Unexpected error during resend:", error);
      setErrors({
        general: "Failed to resend confirmation email. Please check your connection and try again."
      });
    } finally {
      setLoadingState('idle');
    }
  }

  /**
   * Aggressive session establishment with multiple verification steps and redirect methods
   * @param e - Form submit or button click event
   */
  async function handleSubmit(e: React.FormEvent | React.MouseEvent) {
    // Prevent default form submission and multiple submissions
    if (e.type === 'submit') {
      e.preventDefault();
    }

    // Prevent multiple submissions
    if (loadingState !== 'idle') {
      console.log('[Login] Prevented multiple submission attempts');
      return;
    }

    const startTime = Date.now();
    console.log('[Login] Starting login process...', { email: form.email });

    try {
      setErrors({});
      setEmailNotConfirmed(false);
      setRedirectAttempts(0);
      
      // Step 1: Client-side validation
      console.log('[Login] Step 1: Client-side validation');
      setLoadingState('validating');
      const validation = validate(form);
      if (Object.keys(validation).length > 0) {
        console.log('[Login] Validation failed:', validation);
        setErrors(validation);
        setLoadingState('idle');
        return;
      }

      // Step 2: Authenticate with Supabase
      console.log('[Login] Step 2: Authenticating with Supabase');
      setLoadingState('checking');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) {
        console.error('[Login] Authentication failed:', error.message);
        
        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          setEmailNotConfirmed(true);
          setErrors({ 
            general: 'Please confirm your email address before signing in. Check your inbox for a confirmation link.'
          });
        } else if (error.message.includes('Invalid login credentials')) {
          setErrors({ 
            general: 'Invalid email or password. Please check your credentials and try again.'
          });
        } else if (error.message.includes('Too many requests')) {
          setErrors({ 
            general: 'Too many login attempts. Please wait a few minutes before trying again.'
          });
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          setErrors({ 
            general: 'Network error. Please check your connection and try again.'
          });
        } else {
          setErrors({ 
            general: 'An error occurred during login. Please try again.'
          });
        }
        
        setLoadingState('idle');
        return;
      }

      if (!data.user || !data.session) {
        console.error('[Login] Authentication succeeded but no session data!');
        setErrors({ 
          general: "Login succeeded but session was not created. Please try again."
        });
        setLoadingState('idle');
        return;
      }

      console.log('[Login] Authentication successful:', {
        userId: data.user.id,
        email: data.user.email,
        sessionExpiresAt: data.session.expires_at
      });

      // Step 3: Aggressive session establishment with 3-second total wait time
      console.log('[Login] Step 3: Aggressive session establishment');
      setLoadingState('establishing');
      
      // Set localStorage flag for page reload scenarios
      localStorage.setItem('loginInProgress', 'true');
      localStorage.setItem('loginTimestamp', Date.now().toString());
      localStorage.setItem('loginEmail', form.email);

      // First session verification (immediate)
      console.log('[Login] First session verification...');
      let sessionResult = await ensureSessionPersistence({
        forceRefresh: true,
        onError: (error) => console.error('[Login] Session persistence error:', error),
        onSuccess: (session) => console.log('[Login] Session persistence success:', session.user?.email)
      });

      if (!sessionResult.success) {
        console.warn('[Login] First session verification failed, retrying...');
        
        // Wait 1 second and try again
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        sessionResult = await ensureSessionPersistence({
          forceRefresh: true,
          onError: (error) => console.error('[Login] Second session verification error:', error),
          onSuccess: (session) => console.log('[Login] Second session verification success:', session.user?.email)
        });
      }

      if (!sessionResult.success) {
        console.warn('[Login] Second session verification failed, final attempt...');
        
        // Wait 1 more second and try final time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        sessionResult = await ensureSessionPersistence({
          forceRefresh: true,
          onError: (error) => console.error('[Login] Final session verification error:', error),
          onSuccess: (session) => console.log('[Login] Final session verification success:', session.user?.email)
        });
      }

      // Clear localStorage flags
      localStorage.removeItem('loginInProgress');
      localStorage.removeItem('loginTimestamp');
      localStorage.removeItem('loginEmail');

      if (!sessionResult.success) {
        console.error('[Login] All session establishment attempts failed');
        setErrors({ 
          general: "Authentication succeeded but session establishment failed. Please try refreshing the page."
        });
        setLoadingState('idle');
        return;
      }

      console.log('[Login] Session establishment successful after', Date.now() - startTime, 'ms');

      // Step 4: Multiple redirect methods as fallbacks
      console.log('[Login] Step 4: Initiating redirect with multiple fallback methods');
      setLoadingState('redirecting');

      const redirectToDashboard = async () => {
        const maxRedirectAttempts = 3;
        let currentAttempt = 0;

        const attemptRedirect = async (method: string) => {
          currentAttempt++;
          console.log(`[Login] Redirect attempt ${currentAttempt}/${maxRedirectAttempts} using ${method}`);
          
          try {
            switch (method) {
              case 'router':
                await router.replace('/dashboard');
                break;
              case 'location.replace':
                window.location.replace('/dashboard');
                break;
              case 'location.href':
                window.location.href = '/dashboard';
                break;
              case 'reload':
                window.location.reload();
                break;
            }
            
            // Wait a bit to see if redirect worked
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // If we're still on the login page, try next method
            if (window.location.pathname === '/login') {
              console.warn(`[Login] ${method} redirect failed, trying next method...`);
              return false;
            }
            
            return true;
          } catch (error) {
            console.error(`[Login] ${method} redirect failed:`, error);
            return false;
          }
        };

        // Try router first (most reliable for Next.js)
        if (!(await attemptRedirect('router'))) {
          // Try window.location.replace
          if (!(await attemptRedirect('location.replace'))) {
            // Try window.location.href
            if (!(await attemptRedirect('location.href'))) {
              // Final fallback: page reload
              console.log('[Login] All redirect methods failed, using page reload as final fallback');
              await attemptRedirect('reload');
            }
          }
        }
      };

      // Start redirect process
      await redirectToDashboard();

    } catch (error) {
      console.error('[Login] Unexpected error during login:', error);
      
      // Clear localStorage flags on error
      localStorage.removeItem('loginInProgress');
      localStorage.removeItem('loginTimestamp');
      localStorage.removeItem('loginEmail');
      
      setErrors({
        general: error instanceof Error
          ? "An unexpected error occurred. Please check your connection and try again."
          : "An unexpected error occurred. Please try again."
      });
      setLoadingState('idle');
    }
  }

  // Handle page reload scenarios and authentication checks
  React.useEffect(() => {
    console.log('[Login] Component mounted, checking for login in progress...');
    
    // Check if login was in progress from localStorage
    const loginInProgress = localStorage.getItem('loginInProgress');
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    const loginEmail = localStorage.getItem('loginEmail');
    
    if (loginInProgress === 'true' && loginTimestamp && loginEmail) {
      const timeSinceLogin = Date.now() - parseInt(loginTimestamp);
      
      // If login was in progress less than 30 seconds ago, try to complete it
      if (timeSinceLogin < 30000) {
        console.log('[Login] Detected login in progress from page reload, attempting to complete...');
        setForm({ email: loginEmail, password: '' });
        
        // Clear the flags
        localStorage.removeItem('loginInProgress');
        localStorage.removeItem('loginTimestamp');
        localStorage.removeItem('loginEmail');
        
        // Try to establish session and redirect
        const completeLogin = async () => {
          try {
            setLoadingState('establishing');
            console.log('[Login] Attempting to complete login after page reload...');
            
            const sessionResult = await ensureSessionPersistence({
              forceRefresh: true,
              onError: (error) => console.error('[Login] Session completion error:', error),
              onSuccess: (session) => console.log('[Login] Session completion success:', session.user?.email)
            });
            
            if (sessionResult.success) {
              console.log('[Login] Login completed successfully after page reload');
              setLoadingState('redirecting');
              await router.replace('/dashboard');
            } else {
              console.log('[Login] Could not complete login after page reload');
              setLoadingState('idle');
            }
          } catch (error) {
            console.error('[Login] Error completing login after page reload:', error);
            setLoadingState('idle');
          }
        };
        
        completeLogin();
      } else {
        // Clear old flags
        localStorage.removeItem('loginInProgress');
        localStorage.removeItem('loginTimestamp');
        localStorage.removeItem('loginEmail');
      }
    }
  }, [router]);

  // Helper function to get loading text based on state
  const getLoadingText = () => {
    switch (loadingState) {
      case 'validating': return 'Validating...';
      case 'checking': return 'Checking credentials...';
      case 'logging': return 'Logging you in...';
      case 'establishing': return 'Establishing session...';
      case 'redirecting': return 'Redirecting...';
      case 'resending': return 'Sending confirmation...';
      default: return 'Sign In';
    }
  };

  // Check if form is in any loading state
  const isLoading = loadingState !== 'idle';

  return (
    <LoginErrorBoundary>
      <Head>
        <title>Login | NexSellPro</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
        <div className="card max-w-md w-full mx-auto p-8 md:p-10 glass animate-fadeIn shadow-xl">
          <h1 className="text-3xl font-bold text-center mb-2 gradient-text">Sign in to NexSellPro</h1>
          <p className="text-center text-gray-400 mb-6">Welcome back! Enter your details to continue.</p>
          <form className="space-y-5" onSubmit={handleSubmit}>
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
                disabled={isLoading}
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
                  disabled={isLoading}
                  required
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors z-20"
                  disabled={isLoading}
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
                {emailNotConfirmed && (
                  <button
                    type="button"
                    onClick={() => handleResendConfirmation(form.email)}
                    disabled={loadingState === 'resending'}
                    className="mt-2 w-full text-sm text-accent hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingState === 'resending' ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                )}
              </div>
            )}
            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              )}
              {getLoadingText()}
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
          
          {/* Debug section - only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/auth-test');
                    const data = await response.json();
                    console.log('[Debug] Auth status:', data);
                    alert(`Auth Status: ${JSON.stringify(data, null, 2)}`);
                  } catch (error) {
                    console.error('[Debug] Auth test failed:', error);
                    alert('Auth test failed');
                  }
                }}
                className="text-xs text-gray-500 hover:text-gray-400 underline"
              >
                Debug: Check Auth Status
              </button>
            </div>
          )}
        </div>
      </div>
    </LoginErrorBoundary>
  );
} 
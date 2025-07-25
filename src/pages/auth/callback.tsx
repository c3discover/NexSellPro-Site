/**
 * Auth Callback Handler
 * 
 * This component handles all authentication flows from Supabase:
 * - Email confirmation (signup)
 * - Password reset
 * - Magic link login
 * 
 * Flow:
 * 1. Parse URL parameters to determine auth type
 * 2. Check for errors in URL
 * 3. Handle session establishment with retry logic
 * 4. Redirect based on auth type and session status
 * 5. Fallback to login if anything fails
 * 
 * State Machine:
 * - processing: Initial state, handling auth
 * - confirmed: Auth successful, redirecting
 * - error: Auth failed, showing error before redirect
 * - password_reset: Showing password reset form (for recovery type)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Head from 'next/head';

type AuthState = 'processing' | 'confirmed' | 'error' | 'password_reset';
type AuthType = 'signup' | 'recovery' | 'magic_link' | 'unknown';

export default function AuthCallback() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>('processing');
  const [error, setError] = useState<string | null>(null);
  const [authType, setAuthType] = useState<AuthType>('unknown');
  
  // Password reset form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Refs for cleanup and timeout management
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const maxWaitTime = 10000; // 10 seconds

  // Parse URL parameters to determine auth type and check for errors
  const parseUrlParams = (): { type: AuthType; hasError: boolean; errorMessage: string | null } => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);

    // Check for errors first
    const errorParam = hashParams.get('error') || queryParams.get('error');
    const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

    if (errorParam) {
      console.error('[Auth Callback] Error detected:', errorParam, errorDescription);
      return {
        type: 'unknown',
        hasError: true,
        errorMessage: errorDescription || 'Authentication failed'
      };
    }

    // Determine auth type
    const type = hashParams.get('type') || queryParams.get('type');
    let authType: AuthType = 'unknown';

    if (type === 'signup' || type === 'email') {
      authType = 'signup';
    } else if (type === 'recovery') {
      authType = 'recovery';
    } else if (type === 'magic_link') {
      authType = 'magic_link';
    }

    return { type: authType, hasError: false, errorMessage: null };
  };

  // Handle password reset form submission
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate passwords
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('Password must contain uppercase, lowercase, and numbers.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
      } else {
        // Redirect to dashboard after successful password reset
        await router.replace('/dashboard');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Attempt to get or establish session
  const establishSession = async (): Promise<boolean> => {
    try {
      // First, try to get the current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        return true;
      }

      // If no session, try to refresh to establish one
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('[Auth Callback] Session refresh error:', refreshError);
        return false;
      }

      if (refreshedSession) {
        return true;
      }

      // Final attempt: check if session was established via URL processing
      const { data: { session: finalSession } } = await supabase.auth.getSession();

      return !!finalSession;
    } catch (error) {
      console.error('[Auth Callback] Session establishment error:', error);
      return false;
    }
  };

  // Handle successful authentication
  const handleSuccess = useCallback(async (type: AuthType) => {
    // For recovery type, show password reset form instead of redirecting
    if (type === 'recovery') {
      setState('password_reset');
      return;
    }

    // Authentication successful for other types
    setState('confirmed');

    // Get the current user session
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const userId = session.user.id;
      const userMetadata = session.user.user_metadata;

      if (userId) {
        // Create/update user profile for ALL authenticated users
        try {
          // Prepare profile data from user metadata
          const profileData = {
            user_id: userId,
            first_name: userMetadata?.first_name || '',
            last_name: userMetadata?.last_name || '',
            ...(userMetadata?.business_name && { business_name: userMetadata.business_name }),
            ...(userMetadata?.how_did_you_hear && { how_did_you_hear: userMetadata.how_did_you_hear })
          };

          // Upsert user profile (will create if doesn't exist, update if exists)
          const { error: profileError } = await supabase
            .from("user_profiles")
            .upsert(profileData, { onConflict: 'user_id' });

          if (profileError) {
            console.error('[Auth Callback] Failed to upsert user profile:', profileError);
          } else {
            console.log('[Auth Callback] User profile upserted successfully');
          }
        } catch (error) {
          console.error('[Auth Callback] Error upserting user profile:', error);
        }

        // Create/update user plan for ALL authenticated users
        try {
          // Check if user plan already exists
          const { data: existingPlan, error: selectError } = await supabase
            .from("user_plan")
            .select("plan")
            .eq("id", userId)
            .maybeSingle();

          if (selectError) {
            console.error('[Auth Callback] Error checking existing user plan:', selectError);
          }

          // Only create plan if it doesn't exist, or update if needed
          if (!existingPlan) {
            const planData = {
              id: userId,
              plan: userMetadata?.plan || 'free'
            };

            const { error: planError } = await supabase
              .from("user_plan")
              .upsert(planData, { onConflict: 'id' });

            if (planError) {
              console.error('[Auth Callback] Failed to upsert user plan:', planError);
            } else {
              console.log('[Auth Callback] User plan upserted successfully');
            }
          } else {
            console.log('[Auth Callback] User plan already exists:', existingPlan.plan);
          }
        } catch (error) {
          console.error('[Auth Callback] Error upserting user plan:', error);
        }
      }
    }

    // Redirect based on auth type
    const redirectPath = (() => {
      switch (type) {
        case 'signup':
          return '/dashboard';
        case 'magic_link':
          return '/dashboard';
        default:
          return '/dashboard';
      }
    })();

    try {
      await router.replace(redirectPath);
    } catch (error) {
      console.warn('[Auth Callback] Router replace failed, trying reload:', error);
      // Add a call to router.reload() as a fallback if router.replace fails
      router.reload();
    }
  }, [router]);

  // Handle authentication failure
  const handleError = useCallback((message: string, type: AuthType) => {
    console.error('[Auth Callback] Authentication failed:', message);
    setError(message);
    setState('error');

    // Redirect based on auth type
    setTimeout(async () => {
      const redirectPath = (() => {
        switch (type) {
          case 'signup':
            return '/login';
          case 'recovery':
            return '/reset-password-request';
          case 'magic_link':
            return '/login';
          default:
            return '/login';
        }
      })();

      try {
        await router.push(redirectPath);
      } catch (error) {
        console.warn('[Auth Callback] Router push failed, trying reload:', error);
        router.reload();
      }
    }, 3000);
  }, [router]);

  // Main auth processing logic
  const processAuth = useCallback(async () => {
    const { type, hasError, errorMessage } = parseUrlParams();
    setAuthType(type);

    if (hasError) {
      handleError(errorMessage!, type);
      return;
    }

    // If no auth type is detected, this might be a direct visit or failed redirect
    if (type === 'unknown') {
      console.warn('[Auth Callback] No auth type detected, checking for session...');

      // Check if user is already authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        handleSuccess('signup');
        return;
      } else {
        console.warn('[Auth Callback] No session found, redirecting to login');
        handleError('No authentication parameters found. Please try logging in.', 'signup');
        return;
      }
    }

    // Give Supabase time to process URL tokens (reduced from 2000ms to 1000ms)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Set up maximum wait time
    timeoutRef.current = setTimeout(() => {
      console.warn('[Auth Callback] Maximum wait time reached');
      handleError('Authentication timeout. Please try again.', type);
    }, maxWaitTime);

    // Retry logic for session establishment with shorter intervals
    const attemptSessionEstablishment = async (): Promise<void> => {
      const hasSession = await establishSession();

      if (hasSession) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        handleSuccess(type);
        return;
      }

      retryCountRef.current++;

      if (retryCountRef.current < maxRetries) {
        // Shorter retry intervals (1 second instead of 2)
        setTimeout(attemptSessionEstablishment, 1000);
      } else {
        console.error('[Auth Callback] Max retries reached');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Handle based on auth type with more specific messages
        switch (type) {
          case 'signup':
            handleError('Email confirmed successfully! Please log in with your credentials.', type);
            break;
          case 'recovery':
            handleError('Invalid or expired reset link. Please request a new one.', type);
            break;
          case 'magic_link':
            handleError('Magic link expired or invalid. Please try again.', type);
            break;
          default:
            handleError('Authentication failed. Please try again.', type);
        }
      }
    };

    await attemptSessionEstablishment();
  }, [handleError, handleSuccess]);

  useEffect(() => {
    // Component mounted, starting auth processing
    processAuth();

    // Cleanup function
    return () => {
      // Component unmounting, cleaning up
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [processAuth]);

  // Render password reset form
  if (state === 'password_reset') {
    return (
      <>
        <Head>
          <title>Set New Password | NexSellPro</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
          <div className="card max-w-md w-full mx-auto p-8 md:p-10 glass animate-fadeIn shadow-xl">
            <h1 className="text-3xl font-bold text-center mb-2 gradient-text">Set New Password</h1>
            <p className="text-center text-gray-400 mb-6">
              Enter your new password below.
            </p>
            
            <form onSubmit={handlePasswordReset} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition"
                    placeholder="Enter new password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
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
                <p className="text-xs text-gray-400 mt-1">
                  At least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition"
                    placeholder="Confirm new password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
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
              </div>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              
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
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  // Render based on state
  return (
    <>
      <Head>
        <title>Confirming | NexSellPro</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
        <div className="card max-w-md w-full mx-auto p-8 md:p-10 glass animate-fadeIn shadow-xl text-center">
          {state === 'processing' && (
            <>
              <svg className="animate-spin h-12 w-12 text-accent mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <h1 className="text-2xl font-bold mb-2 gradient-text">Processing...</h1>
              <p className="text-gray-400">
                {authType === 'signup' && 'Confirming your email address...'}
                {authType === 'recovery' && 'Processing password reset...'}
                {authType === 'magic_link' && 'Logging you in...'}
                {authType === 'unknown' && 'Processing authentication...'}
              </p>
            </>
          )}

          {state === 'confirmed' && (
            <>
              <div className="text-4xl mb-4">✅</div>
              <h1 className="text-2xl font-bold mb-2 text-green-400">Success!</h1>
              <p className="text-gray-400">
                {authType === 'signup' && 'Redirecting you to complete your setup...'}
                {authType !== 'signup' && 'Redirecting you to your dashboard...'}
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="text-4xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold mb-2 text-yellow-400">Action Required</h1>
              <p className="text-gray-400 mb-4">{error}</p>
              <p className="text-gray-500 text-sm">Redirecting...</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
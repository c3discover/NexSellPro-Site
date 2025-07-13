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
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Head from 'next/head';

type AuthState = 'processing' | 'confirmed' | 'error';
type AuthType = 'signup' | 'recovery' | 'magic_link' | 'unknown';

export default function AuthCallback() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>('processing');
  const [error, setError] = useState<string | null>(null);
  const [authType, setAuthType] = useState<AuthType>('unknown');
  
  // Refs for cleanup and timeout management
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const maxWaitTime = 10000; // 10 seconds

  // Parse URL parameters to determine auth type and check for errors
  const parseUrlParams = (): { type: AuthType; hasError: boolean; errorMessage: string | null } => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    
    console.log('[Auth Callback] URL:', window.location.href);
    console.log('[Auth Callback] Hash params:', Object.fromEntries(hashParams.entries()));
    console.log('[Auth Callback] Query params:', Object.fromEntries(queryParams.entries()));
    
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

    console.log('[Auth Callback] Auth type detected:', authType);
    return { type: authType, hasError: false, errorMessage: null };
  };

  // Attempt to get or establish session
  const establishSession = async (): Promise<boolean> => {
    try {
      // First, try to get the current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('[Auth Callback] Current session exists?', !!currentSession);
      
      if (currentSession) {
        console.log('[Auth Callback] User:', currentSession.user.email);
        console.log('[Auth Callback] Expires:', new Date((currentSession.expires_at || 0) * 1000));
        return true;
      }

      // If no session, try to refresh to establish one
      console.log('[Auth Callback] No session found, attempting refresh...');
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('[Auth Callback] Session refresh error:', refreshError);
        return false;
      }

      if (refreshedSession) {
        console.log('[Auth Callback] Session established via refresh');
        return true;
      }

      // Final attempt: check if session was established via URL processing
      const { data: { session: finalSession } } = await supabase.auth.getSession();
      console.log('[Auth Callback] Final session check:', !!finalSession);
      
      return !!finalSession;
    } catch (error) {
      console.error('[Auth Callback] Session establishment error:', error);
      return false;
    }
  };

  // Handle successful authentication
  const handleSuccess = useCallback(async (type: AuthType) => {
    // Authentication successful for type: ${type}
    setState('confirmed');
    
    // Redirect based on auth type
    const redirectPath = (() => {
      switch (type) {
        case 'signup':
          return '/dashboard';
        case 'recovery':
          return '/reset-password';
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
        console.log('[Auth Callback] User already authenticated, redirecting to dashboard');
        handleSuccess('signup');
        return;
      } else {
        console.warn('[Auth Callback] No session found, redirecting to login');
        handleError('No authentication parameters found. Please try logging in.', 'signup');
        return;
      }
    }

    // Give Supabase time to process URL tokens (reduced from 2000ms to 1000ms)
    console.log('[Auth Callback] Waiting for Supabase to process URL tokens...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('[Auth Callback] Starting session establishment...');

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
        console.log(`[Auth Callback] Retry attempt ${retryCountRef.current}/${maxRetries}`);
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
              <p className="text-gray-400">Redirecting you to your dashboard...</p>
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
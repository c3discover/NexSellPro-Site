// src/pages/auth/callback.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Head from 'next/head';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // First, check if there's an error in the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for errors in both hash and query params
        const errorParam = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

        if (errorParam) {
          console.error('Auth error from URL:', errorParam, errorDescription);
          setError(errorDescription || 'Authentication failed');
          setLoading(false);
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        // Get the access token from the URL
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const type = hashParams.get('type') || queryParams.get('type');

        console.log('Callback type:', type);
        console.log('Has access token:', !!accessToken);

        if (type === 'signup' || type === 'email') {
          // This is an email confirmation
          console.log('Processing email confirmation...');
          
          // The session should already be set by Supabase from the URL
          // Let's get the current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            setError('Failed to confirm email. Please try again.');
            setLoading(false);
            setTimeout(() => router.push('/login'), 3000);
            return;
          }

          if (session) {
            console.log('Email confirmed, user logged in:', session.user.email);
            
            // Give Supabase a moment to fully establish the session
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Redirect to dashboard
            router.replace('/dashboard');
          } else {
            // No session but we have an access token - try to get the session
            if (accessToken) {
              console.log('No session found, but have access token. Refreshing...');
              
              // Force a session refresh
              const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
              
              if (newSession) {
                console.log('Session refreshed successfully');
                router.replace('/dashboard');
              } else {
                console.error('Could not establish session:', refreshError);
                setError('Email confirmed but could not log you in. Please log in manually.');
                setLoading(false);
                setTimeout(() => router.push('/login'), 3000);
              }
            } else {
              setError('Email confirmed. Please log in to continue.');
              setLoading(false);
              setTimeout(() => router.push('/login'), 3000);
            }
          }
        } else if (type === 'recovery') {
          // This is a password reset
          console.log('Processing password reset...');
          
          // For password reset, we should have a session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // Redirect to reset password page
            router.replace('/reset-password');
          } else {
            setError('Invalid or expired reset link');
            setLoading(false);
            setTimeout(() => router.push('/reset-password-request'), 3000);
          }
        } else {
          // Unknown type or just a regular auth callback
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            router.replace('/dashboard');
          } else {
            router.replace('/login');
          }
        }
      } catch (error) {
        console.error('Callback error:', error);
        setError('An unexpected error occurred');
        setLoading(false);
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <>
      <Head>
        <title>Confirming | NexSellPro</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
        <div className="card max-w-md w-full mx-auto p-8 md:p-10 glass animate-fadeIn shadow-xl text-center">
          {loading && !error && (
            <>
              <svg className="animate-spin h-12 w-12 text-accent mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <h1 className="text-2xl font-bold mb-2 gradient-text">Processing...</h1>
              <p className="text-gray-400">Please wait while we confirm your account.</p>
            </>
          )}
          
          {error && (
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
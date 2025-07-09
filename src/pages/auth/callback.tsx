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
        // Get the error and error_description from URL if they exist
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorParam = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        if (errorParam) {
          console.error('Auth error from URL:', errorParam, errorDescription);
          setError(errorDescription || 'Authentication failed');
          setLoading(false);
          
          // Redirect to login after showing error
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        // Exchange the code for a session
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setLoading(false);
          
          // Redirect to login after showing error
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        if (data?.session) {
          // Force refresh the user to ensure latest data
          await supabase.auth.getUser();
          
          // Small delay to ensure session is properly set
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Redirect to dashboard
          router.replace('/dashboard');
        } else {
          // No session found
          setError('No active session found. Please try logging in again.');
          setLoading(false);
          
          // Redirect to login
          setTimeout(() => router.push('/login'), 3000);
        }
      } catch (error) {
        console.error('Callback error:', error);
        setError('An unexpected error occurred');
        setLoading(false);
        
        // Redirect to login after showing error
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <>
      <Head>
        <title>Confirming Email | NexSellPro</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
        <div className="card max-w-md w-full mx-auto p-8 md:p-10 glass animate-fadeIn shadow-xl text-center">
          {loading && !error && (
            <>
              <svg className="animate-spin h-12 w-12 text-accent mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <h1 className="text-2xl font-bold mb-2 gradient-text">Confirming your email...</h1>
              <p className="text-gray-400">Please wait while we verify your account.</p>
            </>
          )}
          
          {error && (
            <>
              <div className="text-4xl mb-4">❌</div>
              <h1 className="text-2xl font-bold mb-2 text-red-400">Confirmation Failed</h1>
              <p className="text-gray-400 mb-4">{error}</p>
              <p className="text-gray-500 text-sm">Redirecting to login page...</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
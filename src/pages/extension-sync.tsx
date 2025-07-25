/**
 * @fileoverview Extension sync page for NexSellPro
 * @author NexSellPro
 * @created 2025-01-27
 * @lastModified 2025-01-27
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function ExtensionSync() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'not-authenticated' | 'error'>('checking');
  const [message, setMessage] = useState('Checking authentication status...');

  useEffect(() => {
    checkAuthAndSync();
  }, []);

  const checkAuthAndSync = async () => {
    try {
      setStatus('checking');
      setMessage('Checking authentication status...');

      // Check if user is authenticated
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        setStatus('not-authenticated');
        setMessage('Please log in to sync with the extension');
        return;
      }

      // User is authenticated - get their plan
      const { data: userPlan } = await supabase
        .from('user_plan')
        .select('*')
        .eq('id', user.id)
        .single();

      const plan = userPlan?.plan || 'free';

      // Send auth data to extension
      const authData = {
        type: 'NEXSELLPRO_AUTH_SYNC',
        user: {
          id: user.id,
          email: user.email,
          plan: plan
        },
        session: {
          access_token: (await supabase.auth.getSession()).data.session?.access_token
        }
      };

      // Try to send message to extension
      if (window.opener) {
        // If opened by extension, send message back
        window.opener.postMessage(authData, '*');
        setStatus('authenticated');
        setMessage('Authentication synced successfully! You can close this window.');
        
        // Close window after 2 seconds
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        // If opened directly, show instructions
        setStatus('authenticated');
        setMessage('You are logged in. Please use the extension to sync your authentication.');
      }

    } catch (error) {
      console.error('Error during auth sync:', error);
      setStatus('error');
      setMessage('Error syncing authentication. Please try again.');
    }
  };

  const handleLogin = () => {
    router.push('/login?redirect=/extension-sync');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">NexSellPro</h1>
            <p className="text-gray-600">Extension Authentication</p>
          </div>

          {/* Status */}
          <div className="mb-6">
            {status === 'checking' && (
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-700">{message}</span>
              </div>
            )}

            {status === 'authenticated' && (
              <div className="flex items-center justify-center gap-3 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{message}</span>
              </div>
            )}

            {status === 'not-authenticated' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 text-red-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="font-medium">{message}</span>
                </div>
                <button
                  onClick={handleLogin}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center justify-center gap-3 text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-medium">{message}</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-500">
            <p>This page helps sync your authentication with the NexSellPro extension.</p>
            {status === 'authenticated' && (
              <p className="mt-2">The window will close automatically.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
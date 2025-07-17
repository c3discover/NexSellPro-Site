import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { ensureSessionPersistence, getSessionInfo } from '@/lib/auth-helpers';

// Production redirect - remove debug pages from production builds
if (process.env.NODE_ENV === 'production') {
  // This will be executed at build time in production
  // The page will not be included in the production bundle
  return null;
}

/**
 * Authentication Debug Page
 * 
 * This page provides comprehensive debugging tools for authentication issues:
 * - Client-side session information
 * - All Supabase cookies analysis
 * - Server-side authentication status
 * - Debug action buttons for common operations
 * - Clear instructions and troubleshooting guidance
 * 
 * Usage:
 * 1. Navigate to /debug-auth in development
 * 2. Review all authentication data
 * 3. Use debug buttons to test operations
 * 4. Check console for detailed logs
 * 
 * Note: This page is not available in production builds
 */

interface ServerAuthStatus {
  success: boolean;
  timestamp: string;
  environment: string;
  serverTime: string;
  session: {
    exists: boolean;
    valid: boolean;
    userId?: string;
    email?: string;
    expiresAt?: number;
    timeUntilExpiry?: number;
  };
  cookies: {
    count: number;
    supabaseCookies: Array<{
      name: string;
      value: string;
      httpOnly: boolean;
      secure: boolean;
      sameSite?: string;
      maxAge?: number;
    }>;
    missingCookies: string[];
  };
  errors: string[];
  warnings: string[];
  performance: {
    totalTime: number;
    sessionCheckTime: number;
    cookieAnalysisTime: number;
  };
}

interface ClientSessionInfo {
  hasSession: boolean;
  isValid: boolean;
  needsRefresh: boolean;
  user?: {
    id: string;
    email: string;
  };
  expiresAt?: number;
  timeUntilExpiry?: number;
}

export default function DebugAuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clientSession, setClientSession] = useState<ClientSessionInfo | null>(null);
  const [serverAuth, setServerAuth] = useState<ServerAuthStatus | null>(null);
  const [allCookies, setAllCookies] = useState<Array<{ name: string; value: string }>>([]);
  const [debugActions, setDebugActions] = useState<{
    refreshSession: { loading: boolean; result?: string };
    forceRedirect: { loading: boolean; result?: string };
    clearAuth: { loading: boolean; result?: string };
  }>({
    refreshSession: { loading: false },
    forceRedirect: { loading: false },
    clearAuth: { loading: false }
  });
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Load all authentication data
  const loadAuthData = async () => {
    console.log('[Debug Auth] Loading authentication data...');
    setLoading(true);

    try {
      // Get client-side session info
      console.log('[Debug Auth] Getting client-side session info...');
      const sessionInfo = await getSessionInfo();
      setClientSession(sessionInfo);
      console.log('[Debug Auth] Client session info:', sessionInfo);

      // Get all cookies
      console.log('[Debug Auth] Analyzing cookies...');
      const cookies = document.cookie.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return { name: name || '', value: value || '' };
      }).filter(cookie => cookie.name && cookie.value);
      setAllCookies(cookies);
      console.log('[Debug Auth] All cookies:', cookies);

      // Get server-side auth status
      console.log('[Debug Auth] Getting server-side auth status...');
      const response = await fetch('/api/auth-test');
      if (response.ok) {
        const serverData: ServerAuthStatus = await response.json();
        setServerAuth(serverData);
        console.log('[Debug Auth] Server auth status:', serverData);
      } else {
        console.error('[Debug Auth] Server auth test failed:', response.status);
        setServerAuth({
          success: false,
          timestamp: new Date().toISOString(),
          environment: 'unknown',
          serverTime: new Date().toLocaleString(),
          session: { exists: false, valid: false },
          cookies: { count: 0, supabaseCookies: [], missingCookies: [] },
          errors: [`HTTP ${response.status}: ${response.statusText}`],
          warnings: [],
          performance: { totalTime: 0, sessionCheckTime: 0, cookieAnalysisTime: 0 }
        });
      }

    } catch (error) {
      console.error('[Debug Auth] Error loading auth data:', error);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadAuthData();
  }, []);

  // Debug action: Refresh session
  const handleRefreshSession = async () => {
    console.log('[Debug Auth] Refreshing session...');
    setDebugActions(prev => ({ ...prev, refreshSession: { loading: true } }));

    try {
      const result = await ensureSessionPersistence({
        forceRefresh: true,
        onError: (error) => console.error('[Debug Auth] Session refresh error:', error),
        onSuccess: (session) => console.log('[Debug Auth] Session refresh success:', session.user?.email)
      });

      const resultMessage = result.success 
        ? `Session refreshed successfully in ${result.duration}ms`
        : `Session refresh failed: ${result.error}`;

      setDebugActions(prev => ({ 
        ...prev, 
        refreshSession: { loading: false, result: resultMessage }
      }));

      // Reload auth data to show updated state
      await loadAuthData();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDebugActions(prev => ({ 
        ...prev, 
        refreshSession: { loading: false, result: `Error: ${errorMessage}` }
      }));
    }
  };

  // Debug action: Force redirect
  const handleForceRedirect = async () => {
    console.log('[Debug Auth] Testing force redirect...');
    setDebugActions(prev => ({ ...prev, forceRedirect: { loading: true } }));

    try {
      // Try multiple redirect methods
      const methods = ['router', 'location.replace', 'location.href', 'reload'];
      let success = false;
      let resultMessage = '';

      for (const method of methods) {
        try {
          console.log(`[Debug Auth] Trying redirect method: ${method}`);
          
          switch (method) {
            case 'router':
              await router.push('/dashboard');
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
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (window.location.pathname !== '/debug-auth') {
            success = true;
            resultMessage = `Redirect successful using ${method}`;
            break;
          }
        } catch (error) {
          console.error(`[Debug Auth] ${method} redirect failed:`, error);
        }
      }

      if (!success) {
        resultMessage = 'All redirect methods failed';
      }

      setDebugActions(prev => ({ 
        ...prev, 
        forceRedirect: { loading: false, result: resultMessage }
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDebugActions(prev => ({ 
        ...prev, 
        forceRedirect: { loading: false, result: `Error: ${errorMessage}` }
      }));
    }
  };

  // Debug action: Clear authentication
  const handleClearAuth = async () => {
    console.log('[Debug Auth] Clearing authentication...');
    setDebugActions(prev => ({ ...prev, clearAuth: { loading: true } }));

    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      // Clear localStorage flags
      localStorage.removeItem('loginInProgress');
      localStorage.removeItem('loginTimestamp');
      localStorage.removeItem('loginEmail');

      // Clear any other auth-related localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('supabase')) {
          localStorage.removeItem(key);
        }
      });

      setDebugActions(prev => ({ 
        ...prev, 
        clearAuth: { loading: false, result: 'Authentication cleared successfully' }
      }));

      // Reload auth data to show updated state
      await loadAuthData();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDebugActions(prev => ({ 
        ...prev, 
        clearAuth: { loading: false, result: `Error: ${errorMessage}` }
      }));
    }
  };

  // Format time until expiry
  const formatTimeUntilExpiry = (seconds?: number): string => {
    if (!seconds) return 'Unknown';
    if (seconds < 0) return 'Expired';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Get status color
  const getStatusColor = (isValid: boolean): string => {
    return isValid ? 'text-green-400' : 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading authentication debug data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Authentication Debug | NexSellPro</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Authentication Debug</h1>
            <p className="text-gray-400 mb-4">
              Comprehensive debugging tools for authentication issues. Use this page to diagnose login problems.
            </p>
            <div className="flex gap-4 items-center">
              <button
                onClick={loadAuthData}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
              {lastRefresh && (
                <span className="text-sm text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-400 mb-2">What to Look For</h2>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• <strong>Client vs Server mismatch:</strong> If client shows logged in but server doesn&apos;t, there&apos;s a cookie/session sync issue</li>
              <li>• <strong>Missing cookies:</strong> Supabase needs specific cookies for authentication to work</li>
              <li>• <strong>Expired sessions:</strong> Sessions that are expired or about to expire</li>
              <li>• <strong>Performance issues:</strong> Slow session checks might indicate network problems</li>
              <li>• <strong>Environment differences:</strong> Check if issues occur in both development and production</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client-Side Session Information */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Client-Side Session</h2>
              {clientSession ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Has Session:</span>
                    <span className={getStatusColor(clientSession.hasSession)}>
                      {clientSession.hasSession ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Is Valid:</span>
                    <span className={getStatusColor(clientSession.isValid)}>
                      {clientSession.isValid ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Needs Refresh:</span>
                    <span className={clientSession.needsRefresh ? 'text-yellow-400' : 'text-green-400'}>
                      {clientSession.needsRefresh ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {clientSession.user && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">User ID:</span>
                        <span className="text-white font-mono text-sm">{clientSession.user.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white">{clientSession.user.email}</span>
                      </div>
                    </>
                  )}
                  {clientSession.expiresAt && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Expires At:</span>
                        <span className="text-white">
                          {new Date(clientSession.expiresAt * 1000).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Time Until Expiry:</span>
                        <span className={clientSession.timeUntilExpiry && clientSession.timeUntilExpiry < 300 ? 'text-red-400' : 'text-white'}>
                          {formatTimeUntilExpiry(clientSession.timeUntilExpiry)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">No session information available</p>
              )}
            </div>

            {/* Server-Side Authentication Status */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Server-Side Status</h2>
              {serverAuth ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Success:</span>
                    <span className={getStatusColor(serverAuth.success)}>
                      {serverAuth.success ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Session Exists:</span>
                    <span className={getStatusColor(serverAuth.session.exists)}>
                      {serverAuth.session.exists ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Session Valid:</span>
                    <span className={getStatusColor(serverAuth.session.valid)}>
                      {serverAuth.session.valid ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {serverAuth.session.userId && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">User ID:</span>
                      <span className="text-white font-mono text-sm">{serverAuth.session.userId}</span>
                    </div>
                  )}
                  {serverAuth.session.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{serverAuth.session.email}</span>
                    </div>
                  )}
                  {serverAuth.session.timeUntilExpiry && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time Until Expiry:</span>
                      <span className={serverAuth.session.timeUntilExpiry < 300 ? 'text-red-400' : 'text-white'}>
                        {formatTimeUntilExpiry(serverAuth.session.timeUntilExpiry)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Response Time:</span>
                    <span className="text-white">{serverAuth.performance.totalTime}ms</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">No server data available</p>
              )}
            </div>
          </div>

          {/* Cookie Analysis */}
          <div className="bg-slate-800 rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold text-white mb-4">Cookie Analysis</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* All Cookies */}
              <div>
                <h3 className="text-lg font-medium text-gray-300 mb-3">All Cookies ({allCookies.length})</h3>
                {allCookies.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {allCookies.map((cookie, index) => (
                      <div key={index} className="bg-slate-700 rounded p-2">
                        <div className="text-sm font-medium text-white">{cookie.name}</div>
                        <div className="text-xs text-gray-400 font-mono break-all">
                          {cookie.value.length > 50 ? `${cookie.value.substring(0, 50)}...` : cookie.value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No cookies found</p>
                )}
              </div>

              {/* Supabase Cookies */}
              <div>
                <h3 className="text-lg font-medium text-gray-300 mb-3">
                  Supabase Cookies ({serverAuth?.cookies.supabaseCookies.length || 0})
                </h3>
                {serverAuth?.cookies.supabaseCookies && serverAuth.cookies.supabaseCookies.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {serverAuth.cookies.supabaseCookies.map((cookie, index) => (
                      <div key={index} className="bg-slate-700 rounded p-2">
                        <div className="text-sm font-medium text-white">{cookie.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{cookie.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No Supabase cookies found</p>
                )}

                {serverAuth?.cookies.missingCookies && serverAuth.cookies.missingCookies.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-yellow-400 mb-2">Missing Expected Cookies:</h4>
                    <div className="space-y-1">
                      {serverAuth.cookies.missingCookies.map((cookie, index) => (
                        <div key={index} className="text-xs text-gray-400">{cookie}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Errors and Warnings */}
          {(serverAuth?.errors.length || serverAuth?.warnings.length) && (
            <div className="bg-slate-800 rounded-lg p-6 mt-6">
              <h2 className="text-xl font-semibold text-white mb-4">Issues Found</h2>
              
              {serverAuth?.errors.length && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-red-400 mb-2">Errors ({serverAuth.errors.length})</h3>
                  <div className="space-y-2">
                    {serverAuth.errors.map((error, index) => (
                      <div key={index} className="bg-red-500/10 border border-red-500/20 rounded p-3">
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {serverAuth?.warnings.length && (
                <div>
                  <h3 className="text-lg font-medium text-yellow-400 mb-2">Warnings ({serverAuth.warnings.length})</h3>
                  <div className="space-y-2">
                    {serverAuth.warnings.map((warning, index) => (
                      <div key={index} className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                        <p className="text-yellow-400 text-sm">{warning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Debug Actions */}
          <div className="bg-slate-800 rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold text-white mb-4">Debug Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Refresh Session */}
              <div className="bg-slate-700 rounded p-4">
                <h3 className="text-lg font-medium text-white mb-2">Refresh Session</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Force refresh the current session using the auth helpers
                </p>
                <button
                  onClick={handleRefreshSession}
                  disabled={debugActions.refreshSession.loading}
                  className="btn-primary w-full"
                >
                  {debugActions.refreshSession.loading ? 'Refreshing...' : 'Refresh Session'}
                </button>
                {debugActions.refreshSession.result && (
                  <p className="text-xs text-gray-400 mt-2">{debugActions.refreshSession.result}</p>
                )}
              </div>

              {/* Force Redirect */}
              <div className="bg-slate-700 rounded p-4">
                <h3 className="text-lg font-medium text-white mb-2">Test Redirect</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Test multiple redirect methods to dashboard
                </p>
                <button
                  onClick={handleForceRedirect}
                  disabled={debugActions.forceRedirect.loading}
                  className="btn-accent w-full"
                >
                  {debugActions.forceRedirect.loading ? 'Testing...' : 'Test Redirect'}
                </button>
                {debugActions.forceRedirect.result && (
                  <p className="text-xs text-gray-400 mt-2">{debugActions.forceRedirect.result}</p>
                )}
              </div>

              {/* Clear Auth */}
              <div className="bg-slate-700 rounded p-4">
                <h3 className="text-lg font-medium text-white mb-2">Clear Auth</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Sign out and clear all authentication data
                </p>
                <button
                  onClick={handleClearAuth}
                  disabled={debugActions.clearAuth.loading}
                  className="btn-secondary w-full"
                >
                  {debugActions.clearAuth.loading ? 'Clearing...' : 'Clear Auth'}
                </button>
                {debugActions.clearAuth.result && (
                  <p className="text-xs text-gray-400 mt-2">{debugActions.clearAuth.result}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="btn-primary mr-4"
            >
              Go to Login
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-accent"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 
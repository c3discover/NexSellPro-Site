import { createServerClient } from '@supabase/ssr';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Server-side Authentication Test API Endpoint
 * 
 * This endpoint provides comprehensive server-side authentication status
 * using Supabase's createServerClient for SSR authentication checks.
 * 
 * Features:
 * - Server-side session verification
 * - Cookie analysis and validation
 * - Detailed error reporting
 * - Performance timing
 * - Environment-specific logging
 */

interface AuthTestResponse {
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthTestResponse | { error: string }>
) {
  // SECURITY: Block this endpoint in production
  if ((process.env.NODE_ENV as string) === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const startTime = Date.now();
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Initialize response object
  const response: AuthTestResponse = {
    success: false,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    serverTime: new Date().toLocaleString(),
    session: {
      exists: false,
      valid: false
    },
    cookies: {
      count: 0,
      supabaseCookies: [],
      missingCookies: []
    },
    errors: [],
    warnings: [],
    performance: {
      totalTime: 0,
      sessionCheckTime: 0,
      cookieAnalysisTime: 0
    }
  };

  try {
    if (isDevelopment) {
      console.log('[Auth Test API] Starting server-side authentication test...');
      console.log('[Auth Test API] Request headers:', Object.keys(req.headers));
    }

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      const error = 'Missing Supabase environment variables';
      console.error('[Auth Test API]', error);
      response.errors.push(error);
      response.performance.totalTime = Date.now() - startTime;
      return res.status(500).json(response);
    }

    // Step 1: Analyze cookies
    const cookieStartTime = Date.now();
    console.log('[Auth Test API] Step 1: Analyzing cookies...');
    
    const allCookies = req.headers.cookie ? req.headers.cookie.split(';') : [];
    response.cookies.count = allCookies.length;

    // Extract Supabase-related cookies
    const supabaseCookieNames = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token'
    ];

    const cookieMap = new Map<string, string>();
    allCookies.forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookieMap.set(name, value);
      }
    });

    // Check for Supabase cookies
    supabaseCookieNames.forEach(cookieName => {
      const value = cookieMap.get(cookieName);
      if (value) {
        response.cookies.supabaseCookies.push({
          name: cookieName,
          value: value.substring(0, 20) + '...', // Truncate for security
          httpOnly: false, // We can't determine this from client-side
          secure: false, // We can't determine this from client-side
        });
      } else {
        response.cookies.missingCookies.push(cookieName);
      }
    });

    // Check for any cookie that might be Supabase-related
    cookieMap.forEach((value, name) => {
      if (name.toLowerCase().includes('supabase') || 
          name.toLowerCase().includes('sb-') ||
          name.toLowerCase().includes('auth')) {
        if (!response.cookies.supabaseCookies.some(c => c.name === name)) {
          response.cookies.supabaseCookies.push({
            name,
            value: value.substring(0, 20) + '...',
            httpOnly: false,
            secure: false,
          });
        }
      }
    });

    response.performance.cookieAnalysisTime = Date.now() - cookieStartTime;

    if (isDevelopment) {
      console.log('[Auth Test API] Cookie analysis complete:', {
        totalCookies: response.cookies.count,
        supabaseCookies: response.cookies.supabaseCookies.length,
        missingCookies: response.cookies.missingCookies
      });
    }

    // Step 2: Create server client and check session
    const sessionStartTime = Date.now();
    console.log('[Auth Test API] Step 2: Creating server client and checking session...');

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return allCookies.map(cookie => {
              const [name, value] = cookie.trim().split('=');
              return { name: name || '', value: value || '' };
            });
          },
          setAll(cookiesToSet) {
            // This is called during session operations
            if (isDevelopment) {
              console.log('[Auth Test API] Cookies being set:', cookiesToSet.length);
            }
          },
        },
      }
    );

    // Get session with error handling
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      const error = `Session check failed: ${sessionError.message}`;
      console.error('[Auth Test API]', error);
      response.errors.push(error);
    } else if (session) {
      response.session.exists = true;
      response.session.userId = session.user?.id;
      response.session.email = session.user?.email || undefined;
      response.session.expiresAt = session.expires_at;

      // Check if session is valid (not expired)
      const now = Math.floor(Date.now() / 1000);
      const bufferTime = 5 * 60; // 5 minutes buffer
      response.session.valid = session.expires_at ? 
        (session.expires_at - bufferTime) > now : false;
      
      response.session.timeUntilExpiry = session.expires_at ? 
        session.expires_at - now : undefined;

      if (isDevelopment) {
        console.log('[Auth Test API] Session found:', {
          userId: session.user?.id,
          email: session.user?.email,
          expiresAt: session.expires_at,
          valid: response.session.valid,
          timeUntilExpiry: response.session.timeUntilExpiry
        });
      }
    } else {
      if (isDevelopment) {
        console.log('[Auth Test API] No session found');
      }
      response.warnings.push('No active session found');
    }

    response.performance.sessionCheckTime = Date.now() - sessionStartTime;

    // Step 3: Additional checks and warnings
    console.log('[Auth Test API] Step 3: Additional checks...');

    // Check for common issues
    if (response.cookies.count === 0) {
      response.warnings.push('No cookies found in request');
    }

    if (response.cookies.supabaseCookies.length === 0) {
      response.warnings.push('No Supabase authentication cookies found');
    }

    if (response.session.exists && !response.session.valid) {
      response.warnings.push('Session exists but is expired or will expire soon');
    }

    if (response.cookies.missingCookies.length > 0) {
      response.warnings.push(`Missing expected cookies: ${response.cookies.missingCookies.join(', ')}`);
    }

    // Check for potential security issues
    const hasSecureCookies = response.cookies.supabaseCookies.some(cookie => 
      cookie.name.toLowerCase().includes('token')
    );
    
    if (!hasSecureCookies && response.cookies.count > 0) {
      response.warnings.push('No authentication tokens found in cookies');
    }

    // Determine overall success
    response.success = response.session.exists && response.session.valid && response.errors.length === 0;

    response.performance.totalTime = Date.now() - startTime;

    if (isDevelopment) {
      console.log('[Auth Test API] Test completed successfully:', {
        success: response.success,
        totalTime: response.performance.totalTime,
        sessionExists: response.session.exists,
        sessionValid: response.session.valid,
        errors: response.errors.length,
        warnings: response.warnings.length
      });
    }

    // Return success response
    return res.status(200).json(response);

  } catch (error) {
    console.error('[Auth Test API] Unexpected error:', error);
    
    response.errors.push(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
    response.performance.totalTime = Date.now() - startTime;
    
    return res.status(500).json(response);
  }
} 
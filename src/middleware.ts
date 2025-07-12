import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Authentication Middleware
 * 
 * PROTECTED ROUTES (require authentication):
 * - /dashboard/* - User dashboard and related pages
 * - /profile/* - User profile management
 * - /settings/* - User settings and preferences
 * 
 * PUBLIC ROUTES (never require authentication):
 * - /auth/callback - Supabase auth callback handler
 * - /reset-password - Password reset form
 * - /reset-password-request - Password reset request form
 * - /api/* - All API endpoints
 * - /login - Login page (redirects if already authenticated)
 * - /signup - Signup page (redirects if already authenticated)
 * 
 * ALL OTHER ROUTES are public by default
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Debug logging in development
  if (isDevelopment) {
    console.log(`[Middleware] Processing route: ${pathname}`);
  }

  // Create a response object to handle cookies
  const response = NextResponse.next();

  // Define public routes that should NEVER require authentication
  const publicRoutes = [
    '/auth/callback',
    '/reset-password',
    '/reset-password-request',
  ];

  // Check if current route is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) || 
                       pathname.startsWith('/api/');

  // If it's a public route, allow access without auth check
  if (isPublicRoute) {
    if (isDevelopment) {
      console.log(`[Middleware] Public route detected: ${pathname} - allowing access`);
    }
    return response;
  }

  // Create Supabase middleware client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    // Refresh session to ensure we have the latest auth state
    // This is critical for production environments where cookies may be stale
    if (isDevelopment) {
      console.log('[Middleware] Refreshing session...');
    }
    
    const { error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.warn('[Middleware] Session refresh warning:', refreshError.message);
      // Continue with existing session even if refresh fails
    } else if (isDevelopment) {
      console.log('[Middleware] Session refresh completed');
    }

    // 200ms delay for cookie propagation in production environments
    // Matches timing strategy in auth-helpers for consistency
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get session with improved error handling
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('[Middleware] Auth error during getSession:', error.message);
      console.error('[Middleware] Error details:', {
        code: error.status,
        name: error.name,
        stack: error.stack
      });
      // On auth error, allow the request to continue (don't block the site)
      return response;
    }

    const isAuthenticated = !!session;

    if (isDevelopment) {
      console.log(`[Middleware] Authentication status: ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`);
      if (session) {
        console.log('[Middleware] Session details:', {
          userId: session.user?.id,
          email: session.user?.email,
          expiresAt: session.expires_at,
          accessTokenExpiry: session.access_token ? 'Present' : 'Missing'
        });
      }
    }

    // Handle protected routes (dashboard, profile, settings)
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/profile') || pathname.startsWith('/settings')) {
      if (!isAuthenticated) {
        if (isDevelopment) {
          console.log(`[Middleware] Redirecting unauthenticated user from ${pathname} to login`);
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', request.url);
        return NextResponse.redirect(loginUrl);
      }
      // User is authenticated, allow access to protected route
      if (isDevelopment) {
        console.log(`[Middleware] Authenticated user accessing protected route: ${pathname}`);
      }
      return response;
    }

    // Handle auth routes (login, signup) - redirect if already authenticated
    if (pathname === '/login' || pathname === '/signup') {
      if (isAuthenticated) {
        // Check for redirect parameter to avoid loops
        const redirectTo = request.nextUrl.searchParams.get('redirect');
        
        if (redirectTo && redirectTo.startsWith('/') && redirectTo !== '/login' && redirectTo !== '/signup') {
          const redirectUrl = new URL(redirectTo, request.url);
          // Ensure redirect is to same origin for security
          if (redirectUrl.origin === request.nextUrl.origin) {
            if (isDevelopment) {
              console.log(`[Middleware] Redirecting authenticated user to: ${redirectTo}`);
            }
            return NextResponse.redirect(redirectUrl);
          }
        }
        
        // Default redirect to dashboard if no valid redirect parameter
        if (isDevelopment) {
          console.log('[Middleware] Redirecting authenticated user to dashboard');
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      // User is not authenticated, allow access to login/signup
      if (isDevelopment) {
        console.log(`[Middleware] Unauthenticated user accessing auth route: ${pathname}`);
      }
      return response;
    }

    // Allow all other routes (public by default)
    if (isDevelopment) {
      console.log(`[Middleware] Allowing access to public route: ${pathname}`);
    }
    return response;

  } catch (error) {
    console.error('[Middleware] Unexpected error:', error);
    console.error('[Middleware] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // On unexpected error, allow the request to continue (don't block the site)
    return response;
  }
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Run middleware on routes that need authentication checks
    '/profile/:path*',
    '/settings/:path*',
    '/signup',
    '/dashboard/:path*',
    '/login',
    // Also run on auth callback and password reset routes to handle them properly
    '/auth/callback',
    '/reset-password',
    '/reset-password-request',
    // Run on API routes to handle them as public
    '/api/:path*'
  ],
}; 
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Authentication Middleware
 * 
 * This middleware handles authentication for the application with the following rules:
 * 
 * PUBLIC ROUTES (skip all auth checks):
 * - /auth/callback - Supabase auth callback handler
 * - /reset-password - Password reset form
 * - /reset-password-request - Password reset request form
 * - /api/* - All API endpoints
 * - /debug-auth - Debug page (development only)
 * 
 * PROTECTED ROUTES (require authentication):
 * - /dashboard/* - User dashboard and related pages
 * - /profile/* - User profile management
 * - /settings/* - User settings and preferences
 * 
 * AUTH ROUTES (redirect if already authenticated):
 * - /login - Login page
 * - /signup - Signup page
 * 
 * ALL OTHER ROUTES are public by default
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDevelopment = process.env.NODE_ENV === 'development';
  const startTime = Date.now();

  // Extensive debug logging in development
  if (isDevelopment) {
    console.log(`[Middleware] ===== Starting middleware for: ${pathname} =====`);
    console.log(`[Middleware] Request method: ${request.method}`);
    console.log(`[Middleware] User agent: ${request.headers.get('user-agent')?.substring(0, 100)}...`);
  }

  // Create a response object to handle cookies
  const response = NextResponse.next();

  // Define public routes that should NEVER require authentication checks
  const publicRoutes = [
    '/auth/callback',
    '/reset-password',
    '/reset-password-request',
  ];

  // Add debug-auth to public routes in development
  if (isDevelopment) {
    publicRoutes.push('/debug-auth');
  }

  // Check if current route is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) || 
                       pathname.startsWith('/api/');

  // If it's a public route, allow access without any auth check
  if (isPublicRoute) {
    if (isDevelopment) {
      console.log(`[Middleware] Public route detected: ${pathname} - skipping all auth checks`);
      console.log(`[Middleware] Total middleware time: ${Date.now() - startTime}ms`);
    }
    return response;
  }

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isDevelopment) {
      console.error('[Middleware] Missing Supabase environment variables');
    }
    // Allow request to continue even without Supabase config
    return response;
  }

  // Create Supabase middleware client with proper error handling
  let supabase;
  try {
    supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            if (isDevelopment) {
              console.log(`[Middleware] Setting ${cookiesToSet.length} cookies`);
            }
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );
  } catch (error) {
    if (isDevelopment) {
      console.error('[Middleware] Failed to create Supabase client:', error);
    }
    // Allow request to continue even if Supabase client creation fails
    return response;
  }

  try {
    // Define protected routes that require session refresh
    const protectedRoutes = ['/dashboard', '/profile', '/settings'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    // Only refresh session for protected routes to avoid interfering with login flow
    if (isProtectedRoute) {
      if (isDevelopment) {
        console.log('[Middleware] Protected route detected, refreshing session...');
      }
      
      try {
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          if (isDevelopment) {
            console.warn('[Middleware] Session refresh warning:', refreshError.message);
          }
          // Continue with existing session even if refresh fails
        } else if (isDevelopment) {
          console.log('[Middleware] Session refresh completed successfully');
        }

        // Add delay for cookie propagation (longer in production)
        const delayMs = isDevelopment ? 100 : 300;
        if (isDevelopment) {
          console.log(`[Middleware] Waiting ${delayMs}ms for cookie propagation...`);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
      } catch (refreshError) {
        if (isDevelopment) {
          console.error('[Middleware] Session refresh failed:', refreshError);
        }
        // Continue with existing session even if refresh fails
      }
    } else if (isDevelopment) {
      console.log('[Middleware] Non-protected route, skipping session refresh');
    }

    // Get session with comprehensive error handling
    let session = null;
    let sessionError = null;
    
    try {
      const { data, error } = await supabase.auth.getSession();
      session = data.session;
      sessionError = error;
    } catch (error) {
      if (isDevelopment) {
        console.error('[Middleware] Unexpected error during getSession:', error);
      }
      sessionError = error;
    }

    if (sessionError) {
      if (isDevelopment) {
        console.error('[Middleware] Session check error:', sessionError);
        console.error('[Middleware] Error details:', {
          message: sessionError instanceof Error ? sessionError.message : 'Unknown error',
          name: sessionError instanceof Error ? sessionError.name : 'Unknown',
        });
      }
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
          accessTokenExpiry: session.access_token ? 'Present' : 'Missing',
          refreshToken: session.refresh_token ? 'Present' : 'Missing'
        });
      }
    }

    // Handle protected routes (dashboard, profile, settings)
    if (isProtectedRoute) {
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
        if (isDevelopment) {
          console.log('[Middleware] Authenticated user accessing auth route, checking redirect...');
        }
        
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
          console.log('[Middleware] Redirecting authenticated user to dashboard (default)');
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
    if (isDevelopment) {
      console.error('[Middleware] Unexpected error:', error);
      console.error('[Middleware] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
    // On unexpected error, allow the request to continue (don't block the site)
    return response;
  } finally {
    if (isDevelopment) {
      console.log(`[Middleware] ===== Completed middleware for: ${pathname} in ${Date.now() - startTime}ms =====`);
    }
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
    '/api/:path*',
    // Add debug-auth in development
    ...(process.env.NODE_ENV === 'development' ? ['/debug-auth'] : [])
  ],
}; 
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define route patterns
const protectedRoutes = ['/dashboard', '/profile', '/settings', '/dashboard/*'];
const authRoutes = ['/login', '/signup'];
const publicRoutes = ['/', '/pricing', '/features', '/about', '/contact', '/terms', '/privacy', '/thank-you'];

// Helper function to check if a path matches any of the given patterns
function isPathMatching(pathname: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    // Exact match
    if (pattern === pathname) return true;
    
    // Pattern with wildcard (e.g., /dashboard/*)
    if (pattern.endsWith('/*')) {
      const basePattern = pattern.slice(0, -2);
      return pathname.startsWith(basePattern);
    }
    
    return false;
  });
}

// Helper function to get the base path (remove query params and hash)
function getBasePath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return url;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const basePath = getBasePath(pathname);

  // Create a response object to handle cookies
  let response = NextResponse.next();

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
    // Refresh session if expired - required for Server Components
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Middleware auth error:', error.message);
    }

    const isAuthenticated = !!session;
    const isProtectedRoute = isPathMatching(basePath, protectedRoutes);
    const isAuthRoute = isPathMatching(basePath, authRoutes);
    const isPublicRoute = isPathMatching(basePath, publicRoutes);

    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Middleware:', {
        pathname: basePath,
        isAuthenticated,
        isProtectedRoute,
        isAuthRoute,
        isPublicRoute
      });
    }

    // Handle protected routes - redirect to login if not authenticated
    if (isProtectedRoute && !isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      
      // Preserve the original URL for redirect after login
      if (basePath !== '/login') {
        loginUrl.searchParams.set('redirect', request.url);
      }
      
      return NextResponse.redirect(loginUrl);
    }

    // Handle auth routes - redirect to dashboard if already authenticated
    if (isAuthRoute && isAuthenticated) {
      const dashboardUrl = new URL('/dashboard', request.url);
      
      // Check if there's a redirect parameter
      const redirectTo = request.nextUrl.searchParams.get('redirect');
      if (redirectTo && redirectTo.startsWith('/')) {
        // Validate redirect URL to prevent open redirects
        const redirectUrl = new URL(redirectTo, request.url);
        if (redirectUrl.origin === request.nextUrl.origin) {
          return NextResponse.redirect(redirectUrl);
        }
      }
      
      return NextResponse.redirect(dashboardUrl);
    }

    // Allow access to public routes
    if (isPublicRoute) {
      return response;
    }

    // For any other routes, allow access (you can modify this behavior)
    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    
    // On error, allow the request to proceed
    // This prevents the app from breaking if there are auth issues
    return response;
  }
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 
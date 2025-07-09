import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create a response object to handle cookies
  const response = NextResponse.next();

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
    // Get session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Middleware auth error:', error.message);
    }

    const isAuthenticated = !!session;

    // Handle protected routes (dashboard, profile, settings)
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/profile') || pathname.startsWith('/settings')) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', request.url);
        return NextResponse.redirect(loginUrl);
      }
      return response;
    }

    // Handle auth routes (login, signup)
    if (pathname === '/login' || pathname === '/signup') {
      if (isAuthenticated) {
        // Check for redirect parameter
        const redirectTo = request.nextUrl.searchParams.get('redirect');
        if (redirectTo && redirectTo.startsWith('/')) {
          const redirectUrl = new URL(redirectTo, request.url);
          if (redirectUrl.origin === request.nextUrl.origin) {
            return NextResponse.redirect(redirectUrl);
          }
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return response;
    }

    // Allow all other routes
    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    return response;
  }
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Only run middleware on specific routes that need authentication checks
    '/profile/:path*',
    '/settings/:path*',
    '/signup',
    '/dashboard/:path*',
    '/login'
  ],
}; 
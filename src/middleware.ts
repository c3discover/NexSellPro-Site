import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Only run middleware on dashboard routes
  if (!request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  // Create a response object - THIS IS CRITICAL!
  const response = NextResponse.next()

  // Create Supabase client for server-side auth check
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set cookies on BOTH request and response
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Check for session
  const { data: { session } } = await supabase.auth.getSession()

  // If no session, redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Allow access to dashboard - return the response object, not NextResponse.next()
  return response
}

export const config = {
  matcher: ['/dashboard/:path*']
}
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Only run middleware on dashboard routes
  if (!request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

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
            request.cookies.set(name, value)
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

  // Allow access to dashboard
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
} 
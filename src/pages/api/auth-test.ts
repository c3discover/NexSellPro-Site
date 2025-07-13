import { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create Supabase client for server-side
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return Object.entries(req.cookies).map(([name, value]) => ({
              name,
              value: value || ''
            }));
          },
          setAll() {
            // This is a read-only endpoint, so we don't need to set cookies
          },
        },
      }
    );

    // Get session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return res.status(200).json({
        authenticated: false,
        error: error.message,
        cookies: Object.keys(req.cookies).filter(key => key.startsWith('sb-'))
      });
    }

    return res.status(200).json({
      authenticated: !!session,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        email_confirmed_at: session.user.email_confirmed_at
      } : null,
      session_expires_at: session?.expires_at,
      cookies: Object.keys(req.cookies).filter(key => key.startsWith('sb-'))
    });

  } catch (error) {
    console.error('[Auth Test API] Error:', error);
    return res.status(500).json({
      authenticated: false,
      error: 'Internal server error',
      cookies: Object.keys(req.cookies).filter(key => key.startsWith('sb-'))
    });
  }
} 
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  // SECURITY: Block this endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
      origin: req.headers.origin || req.headers.host,
      userAgent: req.headers['user-agent'],
      expectedRedirectUrl: `${req.headers.origin || `https://${req.headers.host}`}/auth/callback?type=signup`
    };

    return res.status(200).json({
      message: 'Supabase configuration check',
      config,
      recommendations: [
        'Ensure NEXT_PUBLIC_SUPABASE_URL is set correctly',
        'Ensure NEXT_PUBLIC_SUPABASE_ANON_KEY is set correctly',
        'In Supabase Dashboard > Authentication > URL Configuration:',
        '  - Set Site URL to your domain (e.g., https://nexsellpro.com)',
        '  - Add redirect URLs:',
        '    * https://nexsellpro.com/auth/callback',
        '    * http://localhost:3000/auth/callback (for development)',
        '  - Ensure "Enable email confirmations" is enabled'
      ]
    });

  } catch (error) {
    console.error('[Supabase Config API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
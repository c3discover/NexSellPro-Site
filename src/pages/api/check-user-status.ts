import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers to allow extension requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests from extension
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      })
    }

    // Look up user in the database
    const { data: user, error } = await supabase
      .from('user_plan')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for non-existent users
      console.error('Database error:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Database error' 
      })
    }

    if (!user) {
      // User doesn't exist - they need to sign up
      return res.status(200).json({ 
        success: false, 
        error: 'User not found' 
      })
    }

    // User exists - return their plan status
    const isPaid = user.plan === 'founding'
    
    return res.status(200).json({ 
      success: true, 
      isPaid,
      plan: user.plan,
      email: user.email
    })

  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    })
  }
} 
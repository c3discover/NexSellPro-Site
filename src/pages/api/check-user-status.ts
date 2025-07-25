import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Check user plan
    const { data: userPlan, error } = await supabase
      .from('user_plan')
      .select('plan, email')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !userPlan) {
      return res.status(200).json({ 
        isPaid: false, 
        plan: 'free',
        message: 'User not found'
      })
    }

    // Check for paid plans (case insensitive)
    const plan = userPlan.plan?.toLowerCase()
    const isPaid = plan === 'founding' || plan === 'beta' || plan === 'founder'

    return res.status(200).json({
      isPaid,
      plan: userPlan.plan, // Return original case
      message: isPaid ? 'User is paid' : 'User is free'
    })

  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      isPaid: false,
      plan: 'free'
    })
  }
}
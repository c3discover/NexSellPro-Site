// File: pages/api/create-user-profile.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const supabase = createServerSupabaseClient({ req, res })
  const {
    first_name,
    last_name,
    business_name,
    how_did_you_hear,
  } = req.body

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const uid = user.id
  const email = user.email

  // Insert into user_profiles
  const { error: profileError } = await supabase.from('user_profiles').insert({
    user_id: uid,
    first_name,
    last_name,
    business_name,
    how_did_you_hear,
  })

  if (profileError) {
    console.error('Insert into user_profiles failed:', profileError)
    return res.status(500).json({ error: 'Profile insert failed' })
  }

  // Upsert into user_plan
  const { error: planError } = await supabase.from('user_plan').upsert({
    uuid: uid,
    email,
    first_name,
    last_name,
    plan: 'free',
  }, { onConflict: 'uuid' }) // ensure only one row per user

  if (planError) {
    console.error('Upsert into user_plan failed:', planError)
    return res.status(500).json({ error: 'Plan insert failed' })
  }

  return res.status(200).json({ success: true })
} 
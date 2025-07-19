/////////////////////////////////////////////////////
// 🧠 STRIPE WEBHOOK HANDLER - Environment Aware
// Handles checkout.session.completed events
// Sets `plan = beta` and `is_paid = true` in Supabase
/////////////////////////////////////////////////////

import { buffer } from 'micro'
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const isTesting = process.env.NEXT_PUBLIC_IS_TESTING === 'true'

const stripe = new Stripe(
  isTesting ? process.env.TEST_STRIPE_SECRET_KEY! : process.env.STRIPE_SECRET_KEY!,
  {
    apiVersion: '2025-06-30.basil',
  }
)

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed')
  }

  const sig = req.headers['stripe-signature']!
  const webhookSecret = isTesting
    ? process.env.TEST_STRIPE_WEBHOOK_SECRET
    : process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    const rawBody = await buffer(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret!)
  } catch (err) {
    console.error('❌ Error verifying Stripe webhook:', err)
    return res.status(400).send(`Webhook Error: ${err}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const customerEmail = session.customer_details?.email?.toLowerCase()

    if (!customerEmail) {
      console.error('❌ No customer email in session')
      return res.status(400).send('No customer email found')
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
      // Look up existing auth user by email
      const { data: user, error } = await supabase
        .from('user_plan')
        .select('id')
        .eq('email', customerEmail)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      const now = new Date().toISOString()

      if (user) {
        // Update existing user_plan
        await supabase
          .from('user_plan')
          .update({
            plan: 'beta',
            is_paid: true,
            last_updated: now,
          })
          .eq('id', user.id)
      } else {
        // Create new row
        await supabase.from('user_plan').insert({
          email: customerEmail,
          plan: 'beta',
          is_paid: true,
          created_at: now,
          last_updated: now,
        })
      }

      console.log(`✅ Plan updated for ${customerEmail}`)
      return res.status(200).json({ received: true })
    } catch (err) {
      console.error('❌ Supabase update error:', err)
      return res.status(500).send('Supabase update failed')
    }
  }

  res.status(200).json({ received: true })
}

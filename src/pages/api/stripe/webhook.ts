/////////////////////////////////////////////////////
// 🧠 STRIPE WEBHOOK HANDLER - Environment Aware
// Handles checkout.session.completed events
// Sets `plan = beta` and `is_paid = true` in Supabase
/////////////////////////////////////////////////////

import { buffer } from 'micro'
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

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
    const stripeCustomerId = session.customer

    if (!customerEmail || !stripeCustomerId) {
      console.error('❌ Missing customer email or ID')
      return res.status(400).json({ error: 'Missing Stripe customer info' })
    }

    try {
      // Find the Supabase user by email
      const { data: user, error: userError } = await supabase
        .from('users') // this references the Auth table, not user_plan
        .select('id')
        .eq('email', customerEmail)
        .single()

      if (userError || !user) {
        console.error('❌ Supabase user lookup failed:', userError)
        return res.status(404).json({ error: 'User not found in Supabase' })
      }

      // Insert into user_plan table
      const { error: insertError } = await supabase.from('user_plan').insert([
        {
          id: user.id,
          email: customerEmail,
          plan: 'founding',
          stripe_customer_id: stripeCustomerId,
        },
      ])

      if (insertError) {
        console.error('❌ Insert to user_plan failed:', insertError)
        return res.status(500).json({ error: 'Failed to insert plan info' })
      }

      console.log(`✅ user_plan updated for: ${customerEmail}`)
      return res.status(200).json({ received: true })
    } catch (err) {
      console.error('❌ Supabase update error:', err)
      return res.status(500).send('Supabase update failed')
    }
  }

  res.status(200).json({ received: true })
}

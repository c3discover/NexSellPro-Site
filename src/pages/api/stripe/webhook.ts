// src/pages/api/stripe/webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { buffer } from 'micro'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

export const config = {
  api: {
    bodyParser: false,
  },
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const sig = req.headers['stripe-signature']!
  const buf = await buffer(req)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('❌ Stripe webhook error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const email = session.customer_details?.email ?? ''
    const name = session.customer_details?.name ?? ''
    const stripeCustomerId = session.customer ?? ''
    const [firstName, ...lastParts] = name.split(' ')
    const lastName = lastParts.join(' ')

    // Optional: Lookup user ID by email
    const { data: user, error: fetchError } = await supabase
      .from('user_plan')
      .select('uuid')
      .eq('email', email)
      .single()

    const uuid = user?.uuid ?? undefined

    const { error } = await supabase
      .from('user_plan')
      .upsert(
        {
          uuid,
          email,
          first_name: firstName || null,
          last_name: lastName || null,
          stripe_customer_id: stripeCustomerId || null,
          plan: 'founding',
        },
        { onConflict: 'uuid' }
      )

    if (error) {
      console.error('❌ DB upsert failed:', error.message)
      return res.status(500).json({ error: 'Database insert failed' })
    }

    console.log('✅ Stripe webhook handled successfully')
  }

  return res.status(200).json({ received: true })
}

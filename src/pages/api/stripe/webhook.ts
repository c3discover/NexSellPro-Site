import type { NextApiRequest, NextApiResponse } from 'next'
import { buffer } from 'micro'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase' // or your actual Supabase client import

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

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook Error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const email = session.customer_details?.email
    const fullName = session.customer_details?.name || ''
    const [first_name, last_name] = fullName.split(' ')
    const stripe_customer_id = session.customer as string
    const plan = 'founding'

    if (!email) return res.status(400).json({ error: 'Missing Stripe customer email' })

    // Create Supabase user_plan record
    const { error } = await supabase.from('user_plan').insert({
      email,
      first_name,
      last_name,
      stripe_customer_id,
      plan,
    })

    if (error) {
      console.error('Database insert failed:', error)
      return res.status(500).json({ error: 'Database insert failed' })
    }

    return res.status(200).json({ received: true })
  }

  res.status(200).json({ received: true })
}
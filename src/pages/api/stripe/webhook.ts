// Full update to webhook.ts
// Adds first_name, last_name, and stripe_customer_id from Stripe session

import type { NextApiRequest, NextApiResponse } from 'next'
import { buffer } from 'micro'
import Stripe from 'stripe'
import { createClient } from "@supabase/supabase-js"

export const config = {
  api: {
    bodyParser: false,
  },
}

const stripe = new Stripe(
  process.env.NEXT_PUBLIC_IS_TESTING === "true"
    ? process.env.TEST_STRIPE_SECRET_KEY!
    : process.env.STRIPE_SECRET_KEY!,
  { apiVersion: "2025-06-30.basil" }
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret =
  process.env.NEXT_PUBLIC_IS_TESTING === "true"
    ? process.env.TEST_STRIPE_WEBHOOK_SECRET!
    : process.env.STRIPE_WEBHOOK_SECRET!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader("Allow", "POST");
    return res.status(405).end('Method Not Allowed')
  }

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature'] as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      webhookSecret
    )
  } catch (err: any) {
    console.error('Webhook Error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // 👇 Extract customer info from the session
    const customerId = session.customer as string;
    const customerDetails = session.customer_details;
    const email = customerDetails?.email;
    const fullName = customerDetails?.name || '';
    const [first_name, ...last_name_parts] = fullName.split(' ');
    const last_name = last_name_parts.join(' ');

    if (!email) return res.status(400).json({ error: 'Missing Stripe customer email' })

    // 👇 Insert or update in Supabase user_plan table
    const { error } = await supabase.from('user_plan').upsert({
      email: email.toLowerCase(),
      first_name,
      last_name,
      stripe_customer_id: customerId,
      plan: 'founding',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    }, {
      onConflict: 'email',
    });

    if (error) {
      console.error('Error saving user_plan from Stripe webhook:', error.message);
      return res.status(500).json({ error: 'Database insert failed' });
    }

    return res.status(200).json({ received: true })
  }

  res.status(200).json({ received: true })
}

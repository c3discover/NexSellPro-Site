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
  
    // Extract user ID from client_reference_id
    const userId = session.client_reference_id;
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name;

    // Check if user exists in database
    const { data: existingUser, error: lookupError } = await supabase
      .from('user_plan')
      .select('*')
      .eq('id', userId)
      .single();

    if (lookupError && lookupError.code !== 'PGRST116') {
      console.error('Error looking up user:', lookupError);
      return res.status(500).json({ error: 'Database lookup failed' });
    }

    // Update or insert user plan
    if (existingUser) {
      // Update existing user plan
      const { error: planError } = await supabase
        .from('user_plan')
        .update({ 
          plan: 'founding',
          last_updated: new Date().toISOString()
        })
        .eq('id', userId);

      if (planError) {
        console.error('Error updating user plan:', planError);
        return res.status(500).json({ error: 'Failed to update user plan' });
      }
    } else {
      // Insert new user plan
      const { error: insertError } = await supabase
        .from('user_plan')
        .insert({
          id: userId,
          plan: 'founding',
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting user plan:', insertError);
        return res.status(500).json({ error: 'Failed to insert user plan' });
      }
    }
  
    return res.status(200).json({ received: true })
  }
}
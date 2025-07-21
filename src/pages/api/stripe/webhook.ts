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
  
    const email = session.customer_details?.email
    const fullName = session.customer_details?.name || ''
    const [first_name, last_name] = fullName.split(' ')
    const stripe_customer_id = session.customer as string
  
    if (!email) return res.status(400).json({ error: 'Missing customer email' })
  
    // First, find the user by email in the auth.users table
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('Failed to list users:', userError)
      return res.status(500).json({ error: 'Failed to find user' })
    }
  
    // Find the user with matching email
    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      console.error('No user found with email:', email)
      return res.status(404).json({ error: 'User not found' })
    }
  
    // Update the user's plan (not insert a new record!)
    const { error: planError } = await supabase
      .from('user_plan')
      .update({
        plan: 'founding',
        stripe_customer_id,
        first_name,
        last_name,
        last_updated: new Date().toISOString()
      })
      .eq('id', user.id)  // Use the actual user's ID!
  
    if (planError) {
      // If update fails, the user might not have a plan record yet
      // Try to insert one
      const { error: insertError } = await supabase
        .from('user_plan')
        .insert({
          id: user.id,  // Use the actual user's ID!
          email: email.toLowerCase(),
          first_name,
          last_name,
          plan: 'founding',
          stripe_customer_id,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        })
  
      if (insertError) {
        console.error('Failed to create user plan:', insertError)
        return res.status(500).json({ error: 'Failed to update user plan' })
      }
    }
  
    return res.status(200).json({ received: true })
  }
}
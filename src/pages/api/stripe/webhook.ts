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
  
    // Enhanced debugging
    console.log('=== STRIPE WEBHOOK DEBUG ===');
    console.log('1. Webhook triggered at:', new Date().toISOString());
    console.log('2. Session ID:', session.id);
    console.log('3. Client Reference ID received:', session.client_reference_id);
    console.log('4. Customer email:', session.customer_details?.email);
    console.log('5. Customer name:', session.customer_details?.name);
    
    const userId = session.client_reference_id;
    if (!userId) {
      console.error('ERROR: No client_reference_id in Stripe session');
      console.log('Full session object:', JSON.stringify(session, null, 2));
      return res.status(400).json({ error: 'Missing user reference' });
    }

    // Verify the user exists in our database before updating
    console.log('6. Checking if user exists in database...');
    const { data: existingUser, error: lookupError } = await supabase
      .from('user_plan')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('7. Database lookup result:');
    console.log('   - Found user:', existingUser ? 'YES' : 'NO');
    console.log('   - User data:', existingUser);
    console.log('   - Lookup error:', lookupError);
    
    const email = session.customer_details?.email
    const fullName = session.customer_details?.name || ''
    const [first_name, last_name] = fullName.split(' ')
    const stripe_customer_id = session.customer as string

    console.log('8. Preparing to update user plan...');
    console.log('==============================');
    
    if (!email) return res.status(400).json({ error: 'Missing customer email' })
    
    // Continue with the rest of your webhook code...
    const { error: planError } = await supabase
      .from('user_plan')
      .update({
        plan: 'founding',
        stripe_customer_id,
        email: email.toLowerCase(),
        first_name,
        last_name,
        last_updated: new Date().toISOString()
      })
      .eq('id', userId);

    console.log('Plan update result:', { error: planError });
  
    if (planError) {
      // If update fails, the user might not have a plan record yet
      // Try to insert one
      const { error: insertError } = await supabase
        .from('user_plan')
        .insert({
          id: userId,  // Use the ID from Stripe!
          email: email.toLowerCase(),
          first_name,
          last_name,
          plan: 'founding',
          stripe_customer_id,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        })

      console.log('Plan insert result:', { error: insertError });
  
      if (insertError) {
        console.error('Failed to create user plan:', insertError)
        return res.status(500).json({ error: 'Failed to update user plan' })
      }
    }
  
    return res.status(200).json({ received: true })
  }
}
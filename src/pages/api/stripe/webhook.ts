import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Disable body parsing - CRITICAL for Stripe webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Read the raw body
  const chunks: any[] = [];
  await new Promise((resolve, reject) => {
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(true));
    req.on('error', reject);
  });

  const rawBody = Buffer.concat(chunks);
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log('✅ Webhook verified:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Respond to Stripe immediately
  res.status(200).json({ received: true });

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Get email from session
    const email = session.customer_email || session.customer_details?.email;
    
    if (!email) {
      console.error('❌ No email found in session');
      return;
    }

    console.log('📧 Processing payment for:', email);

    // Create Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error('❌ Missing Supabase environment variables');
      return;
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    try {
      // Step 1: Check if user exists by querying auth.users directly
      console.log('🔍 Checking if user exists...');
      const { data: existingUser, error: lookupError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .single();

      let userId: string;

      if (existingUser) {
        // User exists
        console.log('✅ User already exists:', existingUser.id);
        userId = existingUser.id;
      } else {
        // Create new user
        console.log('🆕 Creating new user...');
        
        // Generate a random password
        const password = Math.random().toString(36).slice(-12) + 'Aa1!';
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: {
            stripe_session_id: session.id,
            payment_date: new Date().toISOString()
          }
        });

        if (createError) {
          console.error('❌ Error creating user:', createError.message);
          return;
        }

        console.log('✅ User created:', newUser.user.id);
        userId = newUser.user.id;

        // Send password reset email for new users
        console.log('📧 Sending password reset email...');
        const { error: emailError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://nexsellpro.com/setup-account'
        });

        if (emailError) {
          console.error('❌ Error sending email:', emailError.message);
        } else {
          console.log('✅ Password reset email sent');
        }
      }

      // Step 2: Update user_plan table
      console.log('💾 Updating user plan...');
      const { error: planError } = await supabase
        .from('user_plan')
        .upsert({
          user_id: userId,
          plan: 'paid',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (planError) {
        console.error('❌ Error updating user plan:', planError.message);
      } else {
        console.log('✅ User plan updated to paid');
      }

      console.log('🎉 Payment processing complete for:', email);

    } catch (error) {
      console.error('❌ Unexpected error:', error);
    }
  }
}
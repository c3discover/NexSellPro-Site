import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
    event = stripe.webhooks.constructEvent(
      rawBody, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('✅ Webhook verified:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  res.status(200).json({ received: true });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_email || session.customer_details?.email;
    
    if (!email) {
      console.error('❌ No email found');
      return;
    }

    console.log('📧 Processing:', email);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Just try to create the user - if they exist, we'll get an error
    const password = Math.random().toString(36).slice(2) + 'Aa1!';
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (error) {
      console.log('⚠️ User exists or error:', error.message);
    } else if (data.user) {
      console.log('✅ User created:', data.user.id);
      
      // Add to user_plan
      await supabase
        .from('user_plan')
        .insert({ 
          user_id: data.user.id, 
          plan: 'paid' 
        });
      
      // Send email
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://nexsellpro.com/setup-account'
      });
      
      console.log('✅ Email sent');
    }
    
    console.log('✅ Done');
  }
}
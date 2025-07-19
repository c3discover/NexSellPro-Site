import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { supabase } from '@/lib/supabase';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).send('Missing Stripe signature');

  let event: Stripe.Event;
  const buf = await buffer(req);

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('❌ Stripe signature validation failed:', err);
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const email = session.customer_details?.email;
    const name = session.customer_details?.name ?? '';
    const stripeCustomerId = session.customer ?? '';

    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ');

    console.log('🧠 Stripe webhook received:', { email, stripeCustomerId });

    // 🔍 Try to find matching uuid from user_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Error looking up profile:', profileError.message);
      return res.status(500).json({ error: 'Profile lookup failed' });
    }

    const uuid = profile?.user_id;
    if (!uuid) {
      console.warn('⚠️ No matching profile found for email:', email);
      return res.status(200).json({ message: 'No profile found — skipping user_plan insert' });
    }

    const { error: upsertError } = await supabase
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
      );

    if (upsertError) {
      console.error('❌ Failed to upsert user_plan:', upsertError.message);
      return res.status(500).json({ error: 'Database insert failed' });
    }

    console.log('✅ Stripe webhook handled successfully');
    return res.status(200).json({ received: true });
  }

  return res.status(200).json({ received: true });
}
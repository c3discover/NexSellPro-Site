import type { NextApiRequest, NextApiResponse } from 'next';
import stripe from '../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Parse the request body
    const { email, uid, name } = req.body;

    // Validate required fields
    if (!email || !uid || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, uid, and name are required' 
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'NexSellPro Founding Member Access',
              description: 'Lifetime access to NexSellPro with all current and future features',
            },
            unit_amount: 2900, // $29.00 in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/thank-you`,
      cancel_url: `${req.headers.origin}/`,
      customer_email: email,
      metadata: {
        supabase_uid: uid,
        email: email,
        full_name: name,
      },
    });

    // Return the checkout URL
    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ 
      error: 'Internal server error while creating checkout session' 
    });
  }
} 
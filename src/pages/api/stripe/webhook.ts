import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { Readable } from 'stream';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil', // Use the version your Stripe package requires
});

// CRITICAL: Disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to get raw body
async function getRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Uint8Array[] = [];
  const readable = req as unknown as Readable;
  
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Debug endpoint (remove in production)
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'Webhook endpoint active',
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      timestamp: new Date().toISOString()
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  
  // Handle case where header might be an array
  const signature = Array.isArray(sig) ? sig[0] : sig;

  if (!signature) {
    console.error('Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;
  let rawBody: string;

  try {
    // Get raw body without using micro
    rawBody = await getRawBody(req);
    
    console.log('Webhook received:', {
      bodyLength: rawBody.length,
      signature: signature.substring(0, 20) + '...',
      secretPreview: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10) + '...'
    });
    
    // Verify webhook
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    console.log('✅ Webhook verified! Event type:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle events
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💰 Payment completed!', {
          sessionId: session.id,
          customerEmail: session.customer_email,
          amountTotal: session.amount_total
        });
        
        // TODO: Add your business logic here
        // - Save to database
        // - Send welcome email
        // - Grant access
        
        break;

      case 'payment_intent.succeeded':
        console.log('💳 Payment succeeded');
        break;

      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed');
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
  }

  // Always return 200
  res.status(200).json({ received: true });
}
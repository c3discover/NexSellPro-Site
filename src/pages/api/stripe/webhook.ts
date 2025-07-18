import type { NextApiRequest, NextApiResponse } from 'next';

// Disable body parsing - CRITICAL for Stripe webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Simple GET test
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Webhook is active',
      timestamp: new Date().toISOString()
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the raw body
    const chunks: any[] = [];
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(true));
      req.on('error', reject);
    });
    const rawBody = Buffer.concat(chunks).toString('utf8');

    // Get Stripe signature
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).json({ error: 'No signature' });
    }

    // For now, just log and return success
    // We'll add Stripe verification once this basic version works
    console.log('Webhook received!');
    console.log('Body length:', rawBody.length);
    console.log('Has signature:', !!sig);

    // Return success
    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
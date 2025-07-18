import { NextApiRequest, NextApiResponse } from 'next';

// Temporarily disable bodyParser to test if route works
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('🚀 Webhook endpoint hit!');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  
  // For ANY request, just return success to test if route exists
  return res.status(200).json({ 
    message: 'Webhook endpoint is working!',
    method: req.method,
    timestamp: new Date().toISOString(),
    headers: {
      'stripe-signature': req.headers['stripe-signature'] || 'not provided',
      'content-type': req.headers['content-type'] || 'not provided'
    }
  });
}
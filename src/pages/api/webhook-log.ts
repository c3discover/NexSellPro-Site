import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Read raw body
  const chunks: any[] = [];
  const rawBody = await new Promise<string>((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
  });

  // Log to console
  console.log('=== WEBHOOK LOG ===');
  console.log('Headers:', req.headers);
  console.log('Body:', rawBody);
  console.log('===================');

  // Return success
  res.status(200).json({ logged: true });
}
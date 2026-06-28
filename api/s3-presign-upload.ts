import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleS3PresignUpload } from './lib/s3PresignHandler';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await handleS3PresignUpload(req.body ?? {});
    return res.status(result.status).json(result.body);
  } catch (e) {
    const err = e as Error;
    console.error('s3-presign-upload error:', err);
    return res.status(500).json({ error: 'Unexpected error', message: err.message });
  }
}

// pages/api/reset-admin.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { hashPassword } from '../../lib/auth';
import supabase from '../../lib/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const password = 'admin123';
    const password_hash = await hashPassword(password);
    
    const { error } = await supabase
      .from('app_users')
      .upsert(
        {
          username: 'admin',
          password_hash,
          full_name: 'Admin User',
          role: 'admin'
        },
        { onConflict: 'username' }
      );

    if (error) throw error;
    
    return res.status(200).json({ 
      message: `Admin password reset to "${password}"`,
      hash: password_hash 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: errorMessage });
  }
}
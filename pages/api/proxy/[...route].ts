import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { token, time, ...params } = req.query;
    const route = Array.isArray(req.query.route) ? req.query.route.join('/') : '';

    if (!token || !time) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const baseUrl = 'https://secura.app.apparelmagic.com/api';
    const url = new URL(`${baseUrl}/${route}`);

    // Add all parameters
    url.searchParams.append('token', token as string);
    url.searchParams.append('time', time as string);
    
    // Add additional parameters
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') {
        url.searchParams.append(key, value);
      }
    });

    console.log('Proxying to:', url.toString()); // Debug log

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Upstream API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorData
      });
      return res.status(response.status).json({ 
        error: "Upstream API error",
        status: response.status,
        details: errorData
      });
    }
    
    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: "Proxy request failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
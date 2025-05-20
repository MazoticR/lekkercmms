// pages/api/proxy/[...route].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import proxyHandler from '../../../lib/proxy';

interface CustomApiRequest extends NextApiRequest {
  query: {
    route: string | string[];
    [key: string]: string | string[] | undefined;
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Safely handle the route parameter
  const routePath = Array.isArray(req.query.route) 
    ? req.query.route.join('/')
    : req.query.route || '';

  // Convert Next.js request to Node.js-style request
  const nodeReq = {
    ...req,
    url: `/api/${routePath}`,
    method: req.method,
    query: req.query
  };

  // Create a mock response object
  const nodeRes = {
    ...res,
    status: (code: number) => ({
      ...res,
      statusCode: code,
      json: (data: any) => res.status(code).json(data),
      end: () => res.end()
    }),
    setHeader: (name: string, value: string) => {
      res.setHeader(name, value);
      return nodeRes;
    },
    json: (data: any) => res.json(data)
  };

  // Call your existing proxy
  return proxyHandler(nodeReq, nodeRes);
}
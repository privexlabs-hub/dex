import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Resolved lazily so `next build` never needs runtime secrets.
const handler = () => toNextJsHandler(auth());
export const GET = (req: Request) => handler().GET(req);
export const POST = (req: Request) => handler().POST(req);

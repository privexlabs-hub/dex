import { toNextJsHandler } from 'better-auth/next-js';
import { staffAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const handler = () => toNextJsHandler(staffAuth());
export const GET = (req: Request) => handler().GET(req);
export const POST = (req: Request) => handler().POST(req);

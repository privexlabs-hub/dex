import { isIP } from 'node:net';
import { forbidden } from '@dex/domain';

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

/** IPv4 CIDR match. IPv6 entries must be exact addresses. */
export function ipMatches(ip: string, entry: string): boolean {
  const [net, bitsRaw] = entry.split('/');
  if (!net) return false;
  if (isIP(ip) === 6 || isIP(net) === 6) return ip === net;
  const bits = bitsRaw ? Number(bitsRaw) : 32;
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(net) & mask);
}

export function clientIp(h: Headers): string | null {
  const candidates = [
    h.get('cf-connecting-ip'),
    h.get('fly-client-ip'),
    h.get('x-forwarded-for')?.split(',')[0]?.trim(),
  ];
  return candidates.find((c): c is string => !!c && isIP(c) !== 0) ?? null;
}

/** No-op when the allowlist is empty (local development). */
export function assertIpAllowed(h: Headers, allowlist: string | undefined): void {
  const entries = (allowlist ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (entries.length === 0) return;
  const ip = clientIp(h);
  if (!ip || !entries.some((e) => ipMatches(ip, e)))
    throw forbidden('Access from this network is not permitted');
}

// Simple stateless HMAC token auth — no extra npm packages needed
const SECRET = process.env.ADMIN_SECRET ?? 'dev-secret-change-in-production';
const COOKIE_NAME = 'admin_token';
const EXPIRE_MS = 24 * 60 * 60 * 1000;

async function hmacSign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Buffer.from(sig).toString('base64url');
}

export async function createToken(): Promise<string> {
  const exp = Date.now() + EXPIRE_MS;
  const sig = await hmacSign(String(exp));
  return `${exp}.${sig}`;
}

export async function verifyToken(token: string): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (Date.now() > Number(exp)) return false;
  const expected = await hmacSign(exp);
  // timing-safe comparison
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export { COOKIE_NAME };

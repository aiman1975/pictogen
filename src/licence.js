// Licence keys for the full version of Toonaro: a short text signed with the owner's private
// signing key (ECDSA P-256, SHA-256), checked by the app with the matching public key - offline,
// no server, nothing sent anywhere. Only whoever holds the private key can make a key that passes;
// anyone can read what a key says (who it is for, which licence, until when).
//
//   TNR1.<the licence, as base64url JSON>.<its signature, base64url>
//
// The licence: { v: 1, id, to (who it is for), type ('family' | 'school' | 'business'), seats?,
// issued ('YYYY-MM-DD'), until? ('YYYY-MM-DD', none: for ever) }.
// Works in the browser and in Node (globalThis.crypto.subtle; a page must be https or localhost).

export const LICENCE_TYPES = ['family', 'school', 'business'];
const PREFIX = 'TNR1';
const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN = { name: 'ECDSA', hash: 'SHA-256' };

const subtle = () => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('this browser cannot check licence keys here (it needs https)');
  return s;
};
const toB64url = (bytes) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (text) => {
  const s = atob(String(text).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(text).length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const utf8 = (s) => new TextEncoder().encode(s);

/** A new signing key pair for the owner: { privateJwk (keep it secret), publicJwk (goes into the app) } */
export async function newSigningKey() {
  const pair = await subtle().generateKey(ALG, true, ['sign', 'verify']);
  const [privateJwk, publicJwk] = await Promise.all([subtle().exportKey('jwk', pair.privateKey), subtle().exportKey('jwk', pair.publicKey)]);
  return { privateJwk, publicJwk: { kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x, y: publicJwk.y } };
}

/** The licence written down and signed with the owner's private key: the licence key text */
export async function signLicence(licence, privateJwk) {
  const clean = cleanLicence(licence);
  const body = toB64url(utf8(JSON.stringify(clean)));
  const key = await subtle().importKey('jwk', privateJwk, ALG, false, ['sign']);
  const sig = new Uint8Array(await subtle().sign(SIGN, key, utf8(`${PREFIX}.${body}`)));
  return `${PREFIX}.${body}.${toB64url(sig)}`;
}

/** What a licence says, tidied (and checked): throws on what isn't a licence */
export function cleanLicence(l) {
  const to = String(l?.to ?? '').trim().slice(0, 80);
  if (!to) throw new Error('who the licence is for is missing');
  if (!LICENCE_TYPES.includes(l?.type)) throw new Error(`the licence type must be ${LICENCE_TYPES.join(', ')}`);
  const day = (d) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  const out = { v: 1, id: String(l.id || randomId()), to, type: l.type, issued: day(l.issued) || new Date().toISOString().slice(0, 10) };
  if (Number.isFinite(+l.seats) && +l.seats > 0) out.seats = Math.round(+l.seats);
  if (day(l.until)) out.until = day(l.until);
  return out;
}
const randomId = () => toB64url(globalThis.crypto.getRandomValues(new Uint8Array(6)));

/**
 * Checks a licence key with the public key: { ok: true, licence } or { ok: false, reason, licence? }.
 * Spaces and line breaks in the text (a key copied from an e-mail) don't matter.
 */
export async function verifyLicence(text, publicJwk, { now = new Date() } = {}) {
  if (!publicJwk) return { ok: false, reason: 'not-set-up' };
  const key = String(text ?? '').replace(/\s+/g, '');
  const parts = key.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, reason: 'not-a-key' };
  let licence;
  try { licence = JSON.parse(new TextDecoder().decode(fromB64url(parts[1]))); } catch { return { ok: false, reason: 'not-a-key' }; }
  let good = false;
  try {
    const pub = await subtle().importKey('jwk', { ...publicJwk, ext: true }, ALG, false, ['verify']);
    good = await subtle().verify(SIGN, pub, fromB64url(parts[2]), utf8(`${PREFIX}.${parts[1]}`));
  } catch { good = false; }
  if (!good) return { ok: false, reason: 'not-genuine' };
  if (licence.until && new Date(`${licence.until}T23:59:59`) < now) return { ok: false, reason: 'expired', licence };
  return { ok: true, licence };
}

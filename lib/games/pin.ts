// The PIN is never stored. It's stretched with PBKDF2 into a key, and the database holds a
// `pins/{key}` document pointing at the family's data. scripts/pin-hash.mjs uses the same parameters.
export const PIN_SALT = 'ajsnow.me/games/v1';
// The admin PIN uses its own salt, so the same digits give a different key than the family PIN.
export const ADMIN_PIN_SALT = 'ajsnow.me/games/admin/v1';
export const PIN_ITERATIONS = 150_000;

export function derivePinKey(pin: string): Promise<string> {
  return deriveKey(pin, PIN_SALT);
}

export function deriveAdminPinKey(pin: string): Promise<string> {
  return deriveKey(pin, ADMIN_PIN_SALT);
}

async function deriveKey(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: PIN_ITERATIONS },
    base,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}

// The PIN is never stored. It's stretched with PBKDF2 into a key, and the database holds a
// `pins/{key}` document pointing at the family's data. scripts/pin-hash.mjs uses the same parameters.
export const PIN_SALT = 'ajsnow.me/games/v1';
export const PIN_ITERATIONS = 150_000;

export async function derivePinKey(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(PIN_SALT), iterations: PIN_ITERATIONS },
    base,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}

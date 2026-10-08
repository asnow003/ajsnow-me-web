// Prints the Firestore document to create for a family PIN.
//   node scripts/pin-hash.mjs 1234             new PIN for a new family
//   node scripts/pin-hash.mjs 1234 <familyId>  change the PIN, keeping the existing family's data
// Parameters must match lib/games/pin.ts.
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const [pin, existingFamilyId] = process.argv.slice(2);
if (!/^\d{4}$/.test(pin ?? '')) {
  console.error('Usage: node scripts/pin-hash.mjs <4-digit PIN> [existing familyId]');
  process.exit(1);
}

const key = pbkdf2Sync(pin, 'ajsnow.me/games/v1', 150_000, 32, 'sha256').toString('hex');
const familyId = existingFamilyId ?? randomBytes(16).toString('base64url');

console.log(`Collection:  pins`);
console.log(`Document ID: ${key}`);
console.log(`Field:       familyId (string) = ${familyId}`);

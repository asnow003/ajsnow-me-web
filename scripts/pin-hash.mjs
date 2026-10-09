// Prints the Firestore document to create for a PIN.
//   node scripts/pin-hash.mjs 1234                    new family PIN for a new family
//   node scripts/pin-hash.mjs 1234 <familyId>         change the family PIN, keeping the family's data
//   node scripts/pin-hash.mjs --admin 5678 <familyId> set the admin PIN for that family
// Parameters must match lib/games/pin.ts.
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const args = process.argv.slice(2);
const admin = args[0] === '--admin';
const [pin, existingFamilyId] = admin ? args.slice(1) : args;
if (!/^\d{4}$/.test(pin ?? '') || (admin && !existingFamilyId)) {
  console.error('Usage: node scripts/pin-hash.mjs <4-digit PIN> [familyId]');
  console.error('       node scripts/pin-hash.mjs --admin <4-digit PIN> <familyId>');
  process.exit(1);
}

const salt = admin ? 'ajsnow.me/games/admin/v1' : 'ajsnow.me/games/v1';
const key = pbkdf2Sync(pin, salt, 150_000, 32, 'sha256').toString('hex');
const familyId = existingFamilyId ?? randomBytes(16).toString('base64url');

console.log(`Collection:  ${admin ? 'adminPins' : 'pins'}`);
console.log(`Document ID: ${key}`);
console.log(`Field:       familyId (string) = ${familyId}`);

// Usage: npm run hash-password -- "my secret password"
// Prints the SHA-256 hash to use as the ADMIN_PASSWORD_SHA256 repository variable.
import { createHash } from 'node:crypto';

const pw = process.argv[2];
if (!pw) {
  console.error('Usage: npm run hash-password -- "your password"');
  process.exit(1);
}
console.log(createHash('sha256').update('socialmoda:' + pw).digest('hex'));

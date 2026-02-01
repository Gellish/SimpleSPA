/**
 * Generates an RFC 4122 compliant UUIDv4.
 * Works in both Node.js and Modern Browsers.
 * @returns {string} UUIDv4
 */
export function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generates a STABLE, deterministic UUID from a string or number.
 * Helpful for mapping numeric database IDs to the Event Store.
 * @param {string|number} input 
 * @returns {string}
 */
export function generateStableUUID(input) {
  const str = String(input);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use the hash to seed a pseudo-random sequence for a UUID-like string
  const seed = Math.abs(hash).toString(16).padEnd(32, '0');
  const uuid = [
    seed.substring(0, 8),
    seed.substring(8, 12),
    '4' + seed.substring(13, 16), // Version 4
    ((parseInt(seed.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + seed.substring(17, 20),
    seed.substring(20, 32)
  ].join('-');

  return uuid;
}

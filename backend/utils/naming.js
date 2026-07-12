// Turns arbitrary user input into a safe SQL/Mongo identifier.
export function safeIdentifier(input, fallback = 'item') {
  const cleaned = String(input || '')
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^_+/, '')
    .replace(/^(\d)/, 'n$1');
  return cleaned.length ? cleaned.slice(0, 60) : fallback;
}

// Builds a unique physical database name namespaced by owner so two users'
// "Ecommerce" projects never collide on the shared server/cluster.
export function physicalDbName(userId, projectName) {
  const userPart = String(userId).slice(-8);
  return `u${userPart}_${safeIdentifier(projectName)}`.toLowerCase();
}

// Generates realistic-looking dummy security findings for demo scans.
// Deterministic when given a seeded RNG, so seeded data is reproducible.

export interface GeneratedFinding {
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  vulnType: string;
  cweId: string;
  filePath?: string;
  line?: number;
  url?: string;
  recommendation: string;
}

// Small seeded pseudo-random generator (mulberry32)
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Template {
  title: string;
  vulnType: string;
  cweId: string;
  severity: GeneratedFinding['severity'];
  description: string;
  recommendation: string;
}

const SAST_TEMPLATES: Template[] = [
  { title: 'SQL Injection via string concatenation', vulnType: 'SQL Injection', cweId: 'CWE-89', severity: 'CRITICAL',
    description: 'User-controlled input is concatenated directly into a SQL query string, allowing an attacker to alter the query and read or modify arbitrary data.',
    recommendation: 'Use parameterized queries / prepared statements or an ORM query builder. Never build SQL from raw user input.' },
  { title: 'Hardcoded API secret in source code', vulnType: 'Hardcoded Secret', cweId: 'CWE-798', severity: 'CRITICAL',
    description: 'A credential (API key or password) is committed to the repository. Anyone with read access to the code can use it.',
    recommendation: 'Move secrets to environment variables or a secret manager, rotate the exposed credential immediately, and add secret scanning to CI.' },
  { title: 'Reflected Cross-Site Scripting (XSS)', vulnType: 'Cross-Site Scripting', cweId: 'CWE-79', severity: 'HIGH',
    description: 'A request parameter is written into the HTML response without encoding, letting an attacker execute JavaScript in a victim browser.',
    recommendation: 'Encode all output for the HTML context and enable a strict Content-Security-Policy. Prefer framework auto-escaping.' },
  { title: 'Path traversal in file download handler', vulnType: 'Path Traversal', cweId: 'CWE-22', severity: 'HIGH',
    description: 'A filename from the request is used to build a filesystem path without normalization, allowing "../" sequences to escape the intended directory.',
    recommendation: 'Resolve the path, verify it stays inside the allowed base directory, and reject any input containing traversal sequences.' },
  { title: 'Insecure deserialization of untrusted data', vulnType: 'Insecure Deserialization', cweId: 'CWE-502', severity: 'HIGH',
    description: 'Untrusted input is deserialized into objects, which can lead to remote code execution with vulnerable gadget chains.',
    recommendation: 'Avoid native deserialization of untrusted data; use plain JSON with schema validation instead.' },
  { title: 'Missing authorization check on admin endpoint', vulnType: 'Broken Access Control', cweId: 'CWE-306', severity: 'HIGH',
    description: 'An administrative controller method lacks the authorization guard applied to sibling routes, so any authenticated user can call it.',
    recommendation: 'Apply the authorization guard consistently (deny-by-default) and add an integration test for role enforcement.' },
  { title: 'Outdated dependency with known CVEs', vulnType: 'Vulnerable Dependency', cweId: 'CWE-1104', severity: 'MEDIUM',
    description: 'A third-party package pinned in the lockfile has published security advisories in the installed version range.',
    recommendation: 'Upgrade to the patched version and enable automated dependency update checks (e.g., Renovate or Dependabot).' },
  { title: 'Weak cryptographic hash (MD5) used for passwords', vulnType: 'Weak Cryptography', cweId: 'CWE-327', severity: 'MEDIUM',
    description: 'Passwords are hashed with MD5, which is fast and unsalted, making offline cracking trivial.',
    recommendation: 'Use a slow, salted algorithm such as bcrypt, scrypt or Argon2id with sensible cost parameters.' },
  { title: 'Insecure random used for session token', vulnType: 'Insecure Randomness', cweId: 'CWE-330', severity: 'MEDIUM',
    description: 'Math.random() is used to generate a security-sensitive token, producing predictable values.',
    recommendation: 'Use a cryptographically secure random source (crypto.randomBytes / crypto.getRandomValues).' },
  { title: 'Verbose stack trace returned to client', vulnType: 'Information Exposure', cweId: 'CWE-209', severity: 'LOW',
    description: 'Unhandled exceptions return full stack traces and internal paths to the API client, aiding attackers in reconnaissance.',
    recommendation: 'Return generic error messages to clients and log details server-side only.' },
  { title: 'Empty catch block swallows security errors', vulnType: 'Improper Error Handling', cweId: 'CWE-390', severity: 'INFO',
    description: 'A try/catch block silently ignores exceptions from a security-relevant operation, hiding failures.',
    recommendation: 'Log the exception and fail closed for security-relevant operations.' },
];

const DAST_TEMPLATES: Template[] = [
  { title: 'Authentication bypass on password reset flow', vulnType: 'Broken Authentication', cweId: 'CWE-287', severity: 'CRITICAL',
    description: 'The password reset endpoint accepts a guessable token, allowing account takeover without knowing the current password.',
    recommendation: 'Use long, single-use, expiring random tokens bound to the user and invalidate them after use.' },
  { title: 'Server-Side Request Forgery (SSRF) in URL fetcher', vulnType: 'SSRF', cweId: 'CWE-918', severity: 'HIGH',
    description: 'The endpoint fetches attacker-supplied URLs server-side, enabling access to internal services and cloud metadata endpoints.',
    recommendation: 'Validate against an allow-list of hosts, block private IP ranges, and disable redirects for server-side fetches.' },
  { title: 'Reflected XSS in search parameter', vulnType: 'Cross-Site Scripting', cweId: 'CWE-79', severity: 'HIGH',
    description: 'The "q" parameter is reflected unencoded into the results page; a crafted link executes script in the victim session.',
    recommendation: 'Encode output for the HTML context and deploy a Content-Security-Policy without unsafe-inline.' },
  { title: 'CORS misconfiguration allows any origin with credentials', vulnType: 'CORS Misconfiguration', cweId: 'CWE-942', severity: 'MEDIUM',
    description: 'The API reflects arbitrary Origin headers while allowing credentials, letting malicious sites read authenticated responses.',
    recommendation: 'Restrict Access-Control-Allow-Origin to an explicit allow-list and never combine wildcard origins with credentials.' },
  { title: 'Open redirect via "next" parameter', vulnType: 'Open Redirect', cweId: 'CWE-601', severity: 'MEDIUM',
    description: 'The login flow redirects to any URL passed in the "next" parameter, which can be abused for phishing.',
    recommendation: 'Only redirect to relative paths or URLs on an allow-list.' },
  { title: 'TLS configuration allows outdated protocol version', vulnType: 'Weak TLS Configuration', cweId: 'CWE-326', severity: 'MEDIUM',
    description: 'The server still negotiates TLS 1.0/1.1, which have known cryptographic weaknesses.',
    recommendation: 'Disable TLS < 1.2 and prefer TLS 1.3 with modern cipher suites.' },
  { title: 'Missing security headers (CSP, X-Frame-Options)', vulnType: 'Insecure Headers', cweId: 'CWE-693', severity: 'LOW',
    description: 'Responses lack Content-Security-Policy, X-Frame-Options and X-Content-Type-Options headers, weakening browser-side defenses.',
    recommendation: 'Add a strict CSP, X-Frame-Options: DENY and X-Content-Type-Options: nosniff (e.g., via helmet).' },
  { title: 'Session cookie without HttpOnly/Secure flags', vulnType: 'Insecure Cookie', cweId: 'CWE-1004', severity: 'LOW',
    description: 'The session cookie is readable by JavaScript and sent over plain HTTP, exposing it to theft.',
    recommendation: 'Set HttpOnly, Secure and SameSite attributes on all session cookies.' },
  { title: 'No rate limiting on login endpoint', vulnType: 'Missing Rate Limiting', cweId: 'CWE-770', severity: 'LOW',
    description: 'Unlimited login attempts are accepted, enabling credential-stuffing and brute-force attacks.',
    recommendation: 'Add per-IP and per-account rate limiting plus temporary lockouts with monitoring.' },
  { title: 'Directory listing enabled on static assets', vulnType: 'Information Exposure', cweId: 'CWE-548', severity: 'INFO',
    description: 'The static file server exposes directory indexes, revealing file names not meant to be public.',
    recommendation: 'Disable auto-indexing on the web server.' },
];

const FILE_PATHS = [
  'src/api/users.controller.ts', 'src/api/orders.service.ts', 'src/auth/login.ts',
  'src/db/query-builder.ts', 'src/utils/crypto.ts', 'src/reports/export.ts',
  'src/files/download.controller.ts', 'src/config/secrets.ts', 'src/jobs/import.worker.ts',
  'src/templates/render.ts', 'src/middleware/errors.ts', 'src/payments/webhook.ts',
];

const URLS = [
  '/api/v1/search?q=', '/api/v1/users/reset-password', '/api/v1/reports/fetch?url=',
  '/login?next=', '/api/v1/orders', '/static/uploads/', '/api/v1/profile',
  '/api/v1/export', '/health', '/api/v1/admin/settings',
];

export function generateFindings(
  type: 'SAST' | 'DAST',
  count: number,
  rng: () => number = Math.random,
): GeneratedFinding[] {
  const templates = type === 'SAST' ? SAST_TEMPLATES : DAST_TEMPLATES;
  const findings: GeneratedFinding[] = [];
  for (let i = 0; i < count; i++) {
    const t = templates[Math.floor(rng() * templates.length)];
    const f: GeneratedFinding = {
      title: t.title,
      description: t.description,
      severity: t.severity,
      vulnType: t.vulnType,
      cweId: t.cweId,
      recommendation: t.recommendation,
    };
    if (type === 'SAST') {
      f.filePath = FILE_PATHS[Math.floor(rng() * FILE_PATHS.length)];
      f.line = 5 + Math.floor(rng() * 400);
    } else {
      f.url = URLS[Math.floor(rng() * URLS.length)];
    }
    findings.push(f);
  }
  return findings;
}

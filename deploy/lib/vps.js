/**
 * VPS connection settings — never commit real credentials.
 * Set VPS_HOST, VPS_USER, VPS_PASSWORD in the environment or a local .env (gitignored).
 */
export const VPS = {
  host: process.env.VPS_HOST || '170.168.6.42',
  username: process.env.VPS_USER || 'root',
  password: process.env.VPS_PASSWORD || '',
  port: Number(process.env.VPS_PORT || 22),
};

export function assertVpsCredentials() {
  if (!VPS.password) {
    throw new Error(
      'Set VPS_PASSWORD in the environment before running deploy scripts.',
    );
  }
}

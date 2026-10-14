/**
 * Shared authorization for the background reminder cron endpoint.
 *
 * The endpoint is intentionally unauthenticated by session (a scheduler has no
 * user cookie), so it is protected by a shared secret instead. Both Vercel Cron
 * and a plain `curl`/`crontab` job send it as a bearer token.
 */

export const CRON_REMINDERS_PATH = "/api/cron/reminders";

/** Constant comparison of the request's bearer token against the cron secret. */
export function isCronAuthorized(
  authorizationHeader: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  if (!authorizationHeader) return false;
  return authorizationHeader === `Bearer ${secret}`;
}

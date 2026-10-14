import { generateReminders } from "@/lib/reminder-engine";
import { isCronAuthorized } from "@/lib/cron";

/**
 * Background reminder generation.
 * ---------------------------------------------------------------------------
 * Called by a scheduler (Vercel Cron or an external `curl`) so reminders are
 * raised even when the dashboard is never opened. It is idempotent and
 * duplicate-safe, so it is safe to call as often as the scheduler likes.
 *
 * Protection: a shared secret in the `Authorization: Bearer <CRON_SECRET>`
 * header. Vercel Cron sends this automatically when `CRON_SECRET` is set.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}

async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await generateReminders();
    return Response.json({ ok: true, ...result });
  } catch {
    return Response.json(
      { ok: false, error: "Reminder generation failed." },
      { status: 500 },
    );
  }
}

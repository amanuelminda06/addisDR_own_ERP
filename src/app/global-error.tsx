"use client";

/**
 * Last-resort boundary for failures inside the root layout itself.
 *
 * Unlike `error.tsx`, this replaces the root layout, so it must render its own
 * `<html>` and `<body>`. It deliberately uses inline styles only: the root
 * layout is what imports `globals.css`, so Tailwind classes are not guaranteed
 * to be present at this point.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 16px",
              borderRadius: 9999,
              background: "#fef2f2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            !
          </div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>
            The application failed to start. If this keeps happening, check the
            server logs and confirm the database is reachable.
          </p>
          {error.digest ? (
            <p style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
              Ref: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#0f766e",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

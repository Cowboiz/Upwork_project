"use client";

type GlobalErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorBoundary({
  reset,
}: GlobalErrorBoundaryProps) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          background: "#f8fafc",
          color: "#102033",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <main
          style={{
            display: "grid",
            minHeight: "100vh",
            placeItems: "center",
            padding: "32px",
          }}
        >
          <section
            style={{
              maxWidth: "560px",
              border: "1px solid #d9e2ec",
              borderRadius: "8px",
              background: "#ffffff",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.1)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#1d4ed8",
                fontSize: "0.875rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              ProjectMatch
            </p>
            <h1
              style={{
                margin: "12px 0 0",
                color: "#020617",
                fontSize: "2rem",
                lineHeight: 1.2,
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                margin: "16px 0 0",
                color: "#334155",
                lineHeight: 1.5,
              }}
            >
              We couldn&apos;t load the application. Please try again.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: "44px",
                marginTop: "24px",
                border: 0,
                borderRadius: "8px",
                background: "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 700,
                padding: "0 18px",
              }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

// GET /ping: a health check with no authentication, Shopify or database calls.
// Call it to wake the server (e.g. Render's free tier sleeps when idle) before
// testing, so incoming webhooks aren't answered by a sleeping server.
export const loader = () =>
  Response.json(
    { status: "ok", time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );

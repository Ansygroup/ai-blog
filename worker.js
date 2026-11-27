// Serves static assets and adds site-wide security headers.
// HSTS: modest 30-day max-age, no includeSubDomains, no preload (per owner decision 2026-11-27).
export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const r = new Response(res.body, res);
    r.headers.set('Strict-Transport-Security', 'max-age=2592000');
    return r;
  },
};

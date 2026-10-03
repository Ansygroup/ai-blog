// Preload: stub global fetch so generate-post.js's Groq provider sees the exact
// response Groq returns for a dead model id: HTTP 404 model_not_found.
const realFetch = globalThis.fetch;
globalThis.fetch = async function (url, opts) {
  const u = String(url);
  if (u.includes('api.groq.com')) {
    return {
      ok: false,
      status: 404,
      text: async () => JSON.stringify({
        error: {
          message: 'The model `qwen/qwen3-32b` does not exist or you do not have access to it.',
          type: 'invalid_request_error',
          code: 'model_not_found',
        },
      }),
      json: async () => ({}),
    };
  }
  return realFetch(url, opts);
};

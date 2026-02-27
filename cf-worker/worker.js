/**
 * Cloudflare Worker - Suno / kie.ai proxy
 *
 * Pure Callback architecture:
 *   1. POST /suno/generate  -> get taskId
 *   2. kie.ai calls POST /suno/callback when done -> stored in KV
 *   3. GET /suno/status     -> reads from KV (fast), falls back to kie.ai
 *
 * Deploy:
 *   1. wrangler secret put SUNO_API_KEY
 *   2. wrangler deploy
 */

const KIE_BASE = 'https://api.kie.ai';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const kieHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.SUNO_API_KEY}`,
    };

    try {
      // POST /suno/callback - kie.ai pushes result here, store in KV
      if (request.method === 'POST' && url.pathname === '/suno/callback') {
        const body = await request.json().catch(() => ({}));
        const cbData = body?.data;
        const taskId = cbData?.task_id;
        const callbackType = cbData?.callbackType;
        console.log(`[callback] type=${callbackType} taskId=${taskId} code=${body?.code}`);

        if (taskId) {
          if (callbackType === 'complete') {
            const tracks = (cbData.data ?? []).map(t => ({
              id: t.id,
              title: t.title,
              audioUrl: t.audio_url,
              imageUrl: t.image_url,
              tags: t.tags,
              prompt: t.prompt,
              model: t.model_name,
              duration: t.duration,
            }));
            await env.TASK_STORE.put(taskId, JSON.stringify({ status: 'SUCCESS', tracks }), { expirationTtl: 86400 });
            console.log(`[callback] KV write SUCCESS taskId=${taskId} tracks=${tracks.length}`);
          } else if (callbackType === 'error') {
            const errStatus = body?.code === 400 ? 'SENSITIVE_WORD_ERROR' : 'GENERATE_AUDIO_FAILED';
            await env.TASK_STORE.put(taskId, JSON.stringify({ status: errStatus, tracks: [] }), { expirationTtl: 86400 });
            console.log(`[callback] KV write ${errStatus} taskId=${taskId}`);
          } else if (callbackType === 'text') {
            await env.TASK_STORE.put(taskId, JSON.stringify({ status: 'TEXT_SUCCESS', tracks: [] }), { expirationTtl: 3600 });
          } else if (callbackType === 'first') {
            await env.TASK_STORE.put(taskId, JSON.stringify({ status: 'FIRST_SUCCESS', tracks: [] }), { expirationTtl: 3600 });
          }
        }
        return jsonResponse({ code: 200, msg: 'ok' });
      }

      // POST /suno/generate
      if (request.method === 'POST' && url.pathname === '/suno/generate') {
        const body = await request.json();
        console.log('[generate] body:', JSON.stringify(body));
        const upstream = await fetch(`${KIE_BASE}/api/v1/generate`, {
          method: 'POST',
          headers: kieHeaders,
          body: JSON.stringify(body),
        });
        const data = await upstream.json();
        console.log(`[generate] upstream=${upstream.status}`, JSON.stringify(data));
        return jsonResponse(data, upstream.status);
      }

      // GET /suno/status?taskId=xxx
      if (request.method === 'GET' && url.pathname === '/suno/status') {
        const taskId = url.searchParams.get('taskId');
        if (!taskId) return jsonResponse({ error: 'Missing taskId parameter' }, 400);

        // KV first (callback already wrote it)
        const cached = await env.TASK_STORE.get(taskId);
        if (cached) {
          const result = JSON.parse(cached);
          console.log(`[status] KV hit taskId=${taskId} status=${result.status}`);
          return jsonResponse({
            code: 200, msg: 'success',
            data: { taskId, status: result.status, response: { sunoData: result.tracks } },
          });
        }

        // KV miss - still generating, fall back to kie.ai
        console.log(`[status] KV miss, calling kie.ai taskId=${taskId}`);
        const upstream = await fetch(
          `${KIE_BASE}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
          { headers: kieHeaders }
        );
        const data = await upstream.json();
        console.log(`[status] kie.ai=${upstream.status} taskStatus=${data?.data?.status}`);
        return jsonResponse(data, upstream.status);
      }

      console.warn(`[worker] unmatched: ${request.method} ${url.pathname}`);
      return jsonResponse({ error: 'Not Found' }, 404);
    } catch (err) {
      console.error('[worker] error:', err.message);
      return jsonResponse({ error: err.message }, 500);
    }
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
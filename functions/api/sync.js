export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const url = new URL(request.url);
    const syncId = url.searchParams.get("id");

    if ((request.method === "PUT" || request.method === "POST") && syncId) {
      const newData = await request.json();
      const id = syncId.toUpperCase();
      
      const existingStr = await env.KOHA_KV.get(id);
      if (!existingStr) {
        return new Response(JSON.stringify({ error: "not_found" }), {
          status: 404,
          headers: corsHeaders,
        });
      }

      const existing = JSON.parse(existingStr);

      const mergeArrays = (arr1 = [], arr2 = []) => {
        const map = new Map();
        [...arr1, ...arr2].forEach((item) => map.set(item.id, item));
        return Array.from(map.values());
      };

      const merged = {
        gifts: mergeArrays(existing.gifts, newData.gifts),
        expenses: mergeArrays(existing.expenses, newData.expenses),
        transfers: mergeArrays(existing.transfers, newData.transfers),
        syncCode: existing.syncCode || newData.syncCode,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
      };

      await env.KOHA_KV.put(id, JSON.stringify(merged));

      return new Response(JSON.stringify({ success: true, data: merged }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (request.method === "POST" && !syncId) {
      const data = await request.json();
      
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let newId = '';
      for (let i = 0; i < 5; i++) {
        newId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const toStore = {
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await env.KOHA_KV.put(newId, JSON.stringify(toStore));

      return new Response(JSON.stringify({ success: true, id: newId }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (request.method === "GET" && syncId) {
      const dataStr = await env.KOHA_KV.get(syncId.toUpperCase());
      
      if (!dataStr) {
        return new Response(JSON.stringify({ error: "not_found" }), {
          status: 404,
          headers: corsHeaders,
        });
      }

      const data = JSON.parse(dataStr);
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ error: "invalid_request" }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncPayload {
  id: string;
  created_at: string;
  store_name: string;
  platform: string;
  strategy_type: string;
  manager_name: string;
  operational_manager: string;
  status_operacional: string;
  status_prazo: string;
  started_at: string;
  deadline: string;
  completed_at: string;
  execution_time: string;
  observation: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SHEETS_WEBHOOK_URL = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
    if (!SHEETS_WEBHOOK_URL) {
      console.error("GOOGLE_SHEETS_WEBHOOK_URL not configured");
      return new Response(
        JSON.stringify({ error: "Sheets webhook URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: SyncPayload = await req.json();

    if (!payload.id) {
      return new Response(
        JSON.stringify({ error: "Missing strategy ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Google Apps Script Web Apps:
    // POST to /macros/s/.../exec → 302 redirect to script.googleusercontent.com
    // The redirect target only accepts GET, so we must:
    // 1. POST with redirect: manual to get the Location header
    // 2. Follow it with GET
    const jsonBody = JSON.stringify(payload);
    
    const postResponse = await fetch(SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: jsonBody,
      redirect: "manual",
    });

    console.log(`POST response status: ${postResponse.status}, headers:`, Object.fromEntries(postResponse.headers.entries()));

    let redirectUrl = postResponse.headers.get("location");
    
    // If first response is also a redirect (e.g. 302 to another google domain), follow chain
    if (!redirectUrl && postResponse.status >= 300 && postResponse.status < 400) {
      await postResponse.text();
      return new Response(
        JSON.stringify({ error: "Redirect without location header" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If we got a non-redirect response, maybe Deno already followed it
    if (!redirectUrl && postResponse.status !== 302) {
      // Try another approach: use the URL with the body as a GET parameter
      const encodedPayload = encodeURIComponent(jsonBody);
      const getUrl = `${SHEETS_WEBHOOK_URL}?payload=${encodedPayload}`;
      
      const getResponse = await fetch(getUrl, {
        method: "GET",
        redirect: "follow",
      });
      
      const result = await getResponse.text();
      console.log(`GET fallback for strategy ${payload.id}: ${getResponse.status} - ${result.substring(0, 300)}`);
      
      return new Response(
        JSON.stringify({ success: true, sheetsResponse: result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consume post response body
    await postResponse.text();

    // Follow redirect chain with GET
    let finalResponse: Response | null = null;
    let currentUrl = redirectUrl!;
    
    for (let i = 0; i < 5; i++) {
      finalResponse = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
      });
      
      const nextLocation = finalResponse.headers.get("location");
      if (finalResponse.status >= 300 && finalResponse.status < 400 && nextLocation) {
        await finalResponse.text();
        currentUrl = nextLocation;
        continue;
      }
      break;
    }

    const result = await finalResponse!.text();
    console.log(`Sync to sheets for strategy ${payload.id}: ${finalResponse!.status} - ${result.substring(0, 300)}`);

    return new Response(
      JSON.stringify({ success: true, sheetsResponse: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync to sheets error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

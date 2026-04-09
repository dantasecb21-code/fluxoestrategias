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

    // Google Apps Script redirects POST to a different URL.
    // We follow redirects manually, re-sending the body as POST each time.
    const jsonBody = JSON.stringify(payload);
    let targetUrl: string = SHEETS_WEBHOOK_URL;
    let lastResponse: Response | null = null;

    for (let i = 0; i < 5; i++) {
      lastResponse = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: jsonBody,
        redirect: "manual",
      });

      const location = lastResponse.headers.get("location");
      if (lastResponse.status >= 300 && lastResponse.status < 400 && location) {
        // Consume body to avoid resource leak
        await lastResponse.text();
        targetUrl = location;
        continue;
      }
      break;
    }

    const result = await lastResponse!.text();
    console.log(`Sync to sheets for strategy ${payload.id}: ${lastResponse!.status} - ${result.substring(0, 200)}`);

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

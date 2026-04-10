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

const statusLabels: Record<string, string> = {
  in_progress: "Em andamento",
  completed: "Concluída",
  pending_approval: "Aguardando aprovação",
  approved: "Aprovada",
  returned: "Devolvida",
};

function computeStatusPrazo(deadline: string, status: string): string {
  if (status === "completed") return "No prazo";
  if (!deadline) return "Sem prazo";
  const today = new Date().toISOString().split("T")[0];
  return today > deadline ? "Atrasada" : "No prazo";
}

function computeExecTime(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return "";
  const diff = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

function sanitizeText(text: string): string {
  if (!text) return "";
  return text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

async function sendToSheets(sheetsUrl: string, payload: SyncPayload): Promise<{ success: boolean; result: string }> {
  // Sanitize all string fields to prevent newlines from creating extra rows
  const sanitized: SyncPayload = {
    ...payload,
    store_name: sanitizeText(payload.store_name),
    manager_name: sanitizeText(payload.manager_name),
    operational_manager: sanitizeText(payload.operational_manager),
    observation: sanitizeText(payload.observation),
  };
  const encodedPayload = encodeURIComponent(JSON.stringify(sanitized));
  const getUrl = `${sheetsUrl}?payload=${encodedPayload}`;
  const response = await fetch(getUrl, { method: "GET", redirect: "follow" });
  const result = await response.text();
  const success = result.includes('"success":true');
  return { success, result: result.substring(0, 300) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SHEETS_WEBHOOK_URL = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
    if (!SHEETS_WEBHOOK_URL) {
      return new Response(
        JSON.stringify({ error: "Sheets webhook URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // BULK SYNC MODE
    if (body.action === "sync_all") {
      console.log("Starting bulk sync...");
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const res = await fetch(
        `${supabaseUrl}/rest/v1/strategies?deleted_at=is.null&order=created_at&select=id,store_name,platform,strategy_type,manager_name,operational_manager,status,deadline,observation,created_at,started_at,completed_at`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error("Failed to fetch strategies:", errText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch strategies" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const strategies = await res.json();
      console.log(`Found ${strategies.length} strategies to sync`);

      let success = 0;
      let fail = 0;

      for (const s of strategies) {
        const payload: SyncPayload = {
          id: s.id,
          created_at: s.created_at,
          store_name: s.store_name,
          platform: s.platform,
          strategy_type: s.strategy_type === "initial" ? "Inicial" : "Reestratégia",
          manager_name: s.manager_name,
          operational_manager: s.operational_manager,
          status_operacional: statusLabels[s.status] || s.status,
          status_prazo: computeStatusPrazo(s.deadline, s.status),
          started_at: s.started_at || "",
          deadline: s.deadline || "",
          completed_at: s.completed_at || "",
          execution_time: computeExecTime(s.started_at, s.completed_at),
          observation: s.observation || "",
        };

        try {
          const r = await sendToSheets(SHEETS_WEBHOOK_URL, payload);
          if (r.success) success++;
          else fail++;
        } catch {
          fail++;
        }
      }

      console.log(`Bulk sync complete: ${success} ok, ${fail} failed out of ${strategies.length}`);

      return new Response(
        JSON.stringify({ success: true, total: strategies.length, synced: success, failed: fail }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SINGLE SYNC MODE
    const payload: SyncPayload = body;
    if (!payload.id) {
      return new Response(
        JSON.stringify({ error: "Missing strategy ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { result } = await sendToSheets(SHEETS_WEBHOOK_URL, payload);
    console.log(`Sync to sheets for strategy ${payload.id}: ${result}`);

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

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

const STATUS_OPERACIONAL_LABELS: Record<string, string> = {
  in_progress: "Em andamento",
  completed: "Concluída",
  pending_approval: "Aguardando aprovação",
  approved: "Aprovada",
  returned: "Devolvida",
};

const PLATFORM_DISPLAY: Record<string, string> = {
  "99food": "99Food",
  ifood: "iFood",
};

const STRATEGY_TYPE_DISPLAY: Record<string, string> = {
  initial: "Estratégia Inicial",
  alignment: "Estratégia de Alinhamento",
  retention: "Estratégia de Retenção",
};

function formatDatePtBR(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

function computeStatusPrazo(deadline: string | null, status: string, completedAt: string | null): string {
  if (status === "approved") return "No prazo";
  if (!deadline) return "Sem prazo";
  const ref = completedAt ? completedAt.split("T")[0] : new Date().toISOString().split("T")[0];
  return ref > deadline ? "Atrasada" : "No prazo";
}

function computeExecTime(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return "";
  const diff = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  return `${days} dias`;
}

function sanitizeText(text: string): string {
  if (!text) return "";
  return text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

async function sendToSheets(sheetsUrl: string, payload: SyncPayload): Promise<{ success: boolean; result: string }> {
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

function buildPayloadFromRow(s: any): SyncPayload {
  return {
    id: s.id,
    created_at: formatDatePtBR(s.created_at),
    store_name: s.store_name || "",
    platform: PLATFORM_DISPLAY[s.platform] || s.platform,
    strategy_type: STRATEGY_TYPE_DISPLAY[s.strategy_type] || s.strategy_type,
    manager_name: s.manager_name || "",
    operational_manager: s.operational_manager || "",
    status_operacional: STATUS_OPERACIONAL_LABELS[s.status] || s.status,
    status_prazo: computeStatusPrazo(s.deadline, s.status, s.completed_at),
    started_at: formatDatePtBR(s.started_at),
    deadline: formatDatePtBR(s.deadline),
    completed_at: formatDatePtBR(s.completed_at),
    execution_time: computeExecTime(s.started_at, s.completed_at),
    observation: s.observation || "",
  };
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
        try {
          const r = await sendToSheets(SHEETS_WEBHOOK_URL, buildPayloadFromRow(s));
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

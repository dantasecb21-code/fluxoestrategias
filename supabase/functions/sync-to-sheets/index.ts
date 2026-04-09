import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

async function sendToSheets(sheetsUrl: string, payload: SyncPayload): Promise<{ success: boolean; result: string }> {
  const encodedPayload = encodeURIComponent(JSON.stringify(payload));
  const getUrl = `${sheetsUrl}?payload=${encodedPayload}`;

  const response = await fetch(getUrl, {
    method: "GET",
    redirect: "follow",
  });

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
      console.error("GOOGLE_SHEETS_WEBHOOK_URL not configured");
      return new Response(
        JSON.stringify({ error: "Sheets webhook URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // BULK SYNC MODE: { action: "sync_all" }
    if (body.action === "sync_all") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const { data: strategies, error } = await supabase
        .from("strategies")
        .select("id, store_name, platform, strategy_type, manager_name, operational_manager, status, deadline, observation, created_at, started_at, completed_at")
        .is("deleted_at", null)
        .order("created_at");

      if (error) {
        console.error("Error fetching strategies:", error.message);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let success = 0;
      let fail = 0;
      const errors: string[] = [];

      for (const s of strategies || []) {
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
          const res = await sendToSheets(SHEETS_WEBHOOK_URL, payload);
          if (res.success) {
            success++;
          } else {
            fail++;
            errors.push(`${s.store_name}: ${res.result}`);
          }
        } catch (e) {
          fail++;
          errors.push(`${s.store_name}: ${e instanceof Error ? e.message : "Unknown"}`);
        }
      }

      console.log(`Bulk sync complete: ${success} ok, ${fail} failed out of ${strategies?.length || 0}`);

      return new Response(
        JSON.stringify({ success: true, total: strategies?.length || 0, synced: success, failed: fail, errors: errors.slice(0, 5) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SINGLE SYNC MODE (original behavior)
    const payload: SyncPayload = body;

    if (!payload.id) {
      return new Response(
        JSON.stringify({ error: "Missing strategy ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { success, result } = await sendToSheets(SHEETS_WEBHOOK_URL, payload);
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

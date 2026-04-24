const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SyncPayload {
  id: string;
  created_at: string;
  store_created_at: string;
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
  keeta: "Keeta",
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

function normalizeStoreKey(storeName: string | null | undefined, platform: string | null | undefined): string {
  const normalizedName = sanitizeText(storeName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const normalizedPlatform = sanitizeText(platform || "").toLowerCase();
  return `${normalizedName}::${normalizedPlatform}`;
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
  const success = response.ok && (result.includes('"success":true') || result.includes('"rows"') || result.includes('"syncedAt"'));
  return { success, result: result.substring(0, 300) };
}

async function sendRawToSheets(sheetsUrl: string, payload: Record<string, unknown>): Promise<{ success: boolean; result: string }> {
  const encodedPayload = encodeURIComponent(JSON.stringify(payload));
  const getUrl = `${sheetsUrl}?payload=${encodedPayload}`;
  const response = await fetch(getUrl, { method: "GET", redirect: "follow" });
  const result = await response.text();
  const success = response.ok && (result.includes('"success":true') || result.includes('"deleted"') || result.includes('"kept"'));
  return { success, result: result.substring(0, 500) };
}

function buildRestHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

async function fetchStrategiesFromDb(
  supabaseUrl: string,
  serviceRoleKey: string,
  strategyId?: string,
): Promise<any[]> {
  const selectFields = "id,created_at,store_name,platform,strategy_type,manager_name,operational_manager,assigned_to,status,deadline,observation,started_at,completed_at,store_request_id";
  const filters = strategyId
    ? `deleted_at=is.null&id=eq.${strategyId}`
    : "deleted_at=is.null&order=created_at";

  const res = await fetch(
    `${supabaseUrl}/rest/v1/strategies?${filters}&select=${selectFields}`,
    { headers: buildRestHeaders(serviceRoleKey) },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch strategies: ${errText}`);
  }

  return await res.json();
}

async function fetchDeletedStrategyIds(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<string[]> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/strategies?deleted_at=not.is.null&select=id`,
    { headers: buildRestHeaders(serviceRoleKey) },
  );
  if (!res.ok) return [];
  const rows = await res.json();
  return rows.map((r: { id: string }) => r.id);
}

async function fetchStoreRequestsFromDb(
  supabaseUrl: string,
  serviceRoleKey: string,
  storeRequestId?: string,
): Promise<any[]> {
  const filters = storeRequestId
    ? `id=eq.${storeRequestId}`
    : "order=created_at";

  const res = await fetch(
    `${supabaseUrl}/rest/v1/store_requests?${filters}&select=id,created_at,store_created_at,store_name,platform,observation`,
    { headers: buildRestHeaders(serviceRoleKey) },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch store requests: ${errText}`);
  }

  return await res.json();
}

function buildEmptyPayload(id: string): SyncPayload {
  return {
    id,
    created_at: "",
    store_created_at: "",
    store_name: "",
    platform: "",
    strategy_type: "",
    manager_name: "",
    operational_manager: "",
    status_operacional: "",
    status_prazo: "",
    started_at: "",
    deadline: "",
    completed_at: "",
    execution_time: "",
    observation: "",
  };
}

function buildStoreRequestResolution(storeRequests: any[], strategies: any[]) {
  const strategiesThatResolveRequests = strategies.filter(
    (strategy: any) => strategy.store_request_id || strategy.strategy_type === "initial",
  );

  const linkedRequestIds = new Set(
    strategiesThatResolveRequests
      .map((strategy: any) => strategy.store_request_id)
      .filter((id: string | null | undefined): id is string => Boolean(id)),
  );

  const resolvedStoreKeys = new Set(
    strategiesThatResolveRequests
      .map((strategy: any) => normalizeStoreKey(strategy.store_name, strategy.platform))
      .filter((key: string) => key !== "::"),
  );

  const orphanRequests: any[] = [];
  const resolvedRequestIds = new Set<string>();

  for (const storeRequest of storeRequests) {
    const storeKey = normalizeStoreKey(storeRequest.store_name, storeRequest.platform);
    const isResolved = linkedRequestIds.has(storeRequest.id) || (storeKey !== "::" && resolvedStoreKeys.has(storeKey));

    if (isResolved) {
      resolvedRequestIds.add(storeRequest.id);
    } else {
      orphanRequests.push(storeRequest);
    }
  }

  return {
    orphanRequests,
    resolvedRequestIds: Array.from(resolvedRequestIds),
  };
}

async function fetchStoreCreatedAtMap(
  supabaseUrl: string,
  serviceRoleKey: string,
  storeRequestIds: Array<string | null | undefined>,
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(storeRequestIds.filter((id): id is string => Boolean(id))));
  if (uniqueIds.length === 0) return {};

  const res = await fetch(
    `${supabaseUrl}/rest/v1/store_requests?select=id,store_created_at&id=in.(${uniqueIds.join(",")})`,
    { headers: buildRestHeaders(serviceRoleKey) },
  );

  if (!res.ok) return {};
  const rows = await res.json();
  return Object.fromEntries(
    rows
      .filter((r: any) => r.store_created_at)
      .map((r: any) => [r.id, r.store_created_at]),
  );
}

async function fetchOperationalManagerMap(
  supabaseUrl: string,
  serviceRoleKey: string,
  userIds: Array<string | null | undefined>,
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  if (uniqueIds.length === 0) return {};

  const res = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=user_id,display_name&user_id=in.(${uniqueIds.join(",")})`,
    { headers: buildRestHeaders(serviceRoleKey) },
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("Failed to fetch profiles:", errText);
    return {};
  }

  const profiles = await res.json();
  return Object.fromEntries(
    profiles.map((profile: { user_id: string; display_name: string }) => [profile.user_id, profile.display_name || ""]),
  );
}

function buildPayloadFromRow(s: any, resolvedOperationalManager?: string, storeCreatedAt?: string): SyncPayload {
  return {
    id: s.id,
    created_at: formatDatePtBR(s.created_at),
    store_created_at: formatDatePtBR(storeCreatedAt || null),
    store_name: s.store_name || "",
    platform: PLATFORM_DISPLAY[s.platform] || s.platform,
    strategy_type: STRATEGY_TYPE_DISPLAY[s.strategy_type] || s.strategy_type,
    manager_name: s.manager_name || "",
    operational_manager: resolvedOperationalManager || s.operational_manager || "",
    status_operacional: STATUS_OPERACIONAL_LABELS[s.status] || s.status,
    status_prazo: computeStatusPrazo(s.deadline, s.status, s.completed_at),
    started_at: formatDatePtBR(s.started_at),
    deadline: formatDatePtBR(s.deadline),
    completed_at: formatDatePtBR(s.completed_at),
    execution_time: computeExecTime(s.started_at, s.completed_at),
    observation: s.observation || "",
  };
}

/** Build a partial payload for a store_request (no strategy data yet) */
function buildStoreRequestPayload(sr: any): SyncPayload {
  return {
    id: sr.id,
    created_at: "",
    store_created_at: formatDatePtBR(sr.store_created_at || sr.created_at),
    store_name: sr.store_name || "",
    platform: PLATFORM_DISPLAY[sr.platform] || sr.platform,
    strategy_type: "",
    manager_name: "",
    operational_manager: "",
    status_operacional: "Aguardando estratégia",
    status_prazo: "",
    started_at: "",
    deadline: "",
    completed_at: "",
    execution_time: "",
    observation: sanitizeText(sr.observation || ""),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SHEETS_WEBHOOK_URL = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SHEETS_WEBHOOK_URL) {
      return new Response(
        JSON.stringify({ error: "Sheets webhook URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Database credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // --- Sync a single store_request (when a new one is created) ---
    if (body.action === "sync_store_request") {
      const sr = body;
      if (!sr.id) {
        return new Response(
          JSON.stringify({ error: "Missing store_request ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const [strategies, storeRequests] = await Promise.all([
        fetchStrategiesFromDb(supabaseUrl, serviceRoleKey),
        fetchStoreRequestsFromDb(supabaseUrl, serviceRoleKey, sr.id),
      ]);

      const { orphanRequests, resolvedRequestIds } = buildStoreRequestResolution(storeRequests, strategies);
      const shouldClear = resolvedRequestIds.includes(sr.id);

      const payload = shouldClear
        ? buildEmptyPayload(sr.id)
        : buildStoreRequestPayload(orphanRequests[0] || sr);

      const { result } = await sendToSheets(SHEETS_WEBHOOK_URL, payload);
      console.log(`Sync store_request ${sr.id} to sheets: ${result}`);

      return new Response(
        JSON.stringify({ success: true, sheetsResponse: result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Bulk sync (strategies + orphan store_requests) ---
    if (body.action === "sync_all") {
      console.log("Starting bulk sync...");

      const [strategies, storeRequests] = await Promise.all([
        fetchStrategiesFromDb(supabaseUrl, serviceRoleKey),
        fetchStoreRequestsFromDb(supabaseUrl, serviceRoleKey),
      ]);

      const { orphanRequests, resolvedRequestIds } = buildStoreRequestResolution(storeRequests, strategies);

      const [operationalManagerMap, storeCreatedAtMap] = await Promise.all([
        fetchOperationalManagerMap(
          supabaseUrl,
          serviceRoleKey,
          strategies.map((strategy: any) => strategy.assigned_to),
        ),
        fetchStoreCreatedAtMap(
          supabaseUrl,
          serviceRoleKey,
          strategies.map((strategy: any) => strategy.store_request_id),
        ),
      ]);

      console.log(`Found ${strategies.length} strategies and ${orphanRequests.length} orphan store requests to sync`);

      let success = 0;
      let fail = 0;

      for (const resolvedRequestId of resolvedRequestIds) {
        try {
          const emptyPayload = buildEmptyPayload(resolvedRequestId);
          await sendToSheets(SHEETS_WEBHOOK_URL, emptyPayload);
        } catch (e) {
          console.error(`Error clearing resolved store_request ${resolvedRequestId}:`, e);
        }
      }

      // Sync strategies
      for (const strategy of strategies) {
        try {
          const payload = buildPayloadFromRow(
            strategy,
            operationalManagerMap[strategy.assigned_to] || strategy.operational_manager,
            storeCreatedAtMap[strategy.store_request_id] || "",
          );
          const response = await sendToSheets(SHEETS_WEBHOOK_URL, payload);
          if (response.success) success++;
          else {
            fail++;
            console.error(`Failed to sync strategy ${strategy.id}: ${response.result}`);
          }
        } catch (e) {
          fail++;
          console.error(`Error syncing strategy ${strategy.id}:`, e);
        }
      }

      // Sync orphan store_requests (no strategy linked yet)
      for (const sr of orphanRequests) {
        try {
          const payload = buildStoreRequestPayload(sr);
          const response = await sendToSheets(SHEETS_WEBHOOK_URL, payload);
          if (response.success) success++;
          else {
            fail++;
            console.error(`Failed to sync store_request ${sr.id}: ${response.result}`);
          }
        } catch (e) {
          fail++;
          console.error(`Error syncing store_request ${sr.id}:`, e);
        }
      }

      // Clean up deleted strategies from the sheet
      let cleaned = 0;
      try {
        const deletedIds = await fetchDeletedStrategyIds(supabaseUrl, serviceRoleKey);
        console.log(`Found ${deletedIds.length} deleted strategies to clean from sheet`);
        const results = await Promise.allSettled(
          deletedIds.map(async (id) => {
            const emptyPayload = buildEmptyPayload(id);
            const response = await sendToSheets(SHEETS_WEBHOOK_URL, emptyPayload);
            return response.success;
          })
        );
        cleaned = results.filter(r => r.status === "fulfilled" && r.value).length;
      } catch (e) {
        console.error("Error cleaning deleted strategies:", e);
      }

      const total = strategies.length + orphanRequests.length;
      console.log(`Bulk sync complete: ${success} ok, ${fail} failed out of ${total}. Cleaned ${cleaned} deleted rows.`);

      return new Response(
        JSON.stringify({ success: true, total, synced: success, failed: fail, cleaned, orphanRequests: orphanRequests.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Reconcile: remove from sheet any row whose ID is not in the app anymore ---
    if (body.action === "reconcile") {
      console.log("Starting reconcile...");

      const [strategies, storeRequests] = await Promise.all([
        fetchStrategiesFromDb(supabaseUrl, serviceRoleKey),
        fetchStoreRequestsFromDb(supabaseUrl, serviceRoleKey),
      ]);

      const { orphanRequests } = buildStoreRequestResolution(storeRequests, strategies);

      const validIds = [
        ...strategies.map((s: any) => s.id),
        ...orphanRequests.map((sr: any) => sr.id),
      ];

      const { success, result } = await sendRawToSheets(SHEETS_WEBHOOK_URL, {
        action: "reconcile",
        valid_ids: validIds,
      });

      console.log(`Reconcile sent ${validIds.length} valid IDs. Sheets response: ${result}`);

      return new Response(
        JSON.stringify({ success, validCount: validIds.length, sheetsResponse: result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Single strategy sync ---
    const payload = body as Partial<SyncPayload>;
    if (!payload.id) {
      return new Response(
        JSON.stringify({ error: "Missing strategy ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [strategy] = await fetchStrategiesFromDb(supabaseUrl, serviceRoleKey, payload.id);
    if (!strategy) {
      return new Response(
        JSON.stringify({ error: "Strategy not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [operationalManagerMap, storeCreatedAtMap, storeRequests] = await Promise.all([
      fetchOperationalManagerMap(supabaseUrl, serviceRoleKey, [strategy.assigned_to]),
      fetchStoreCreatedAtMap(supabaseUrl, serviceRoleKey, [strategy.store_request_id]),
      fetchStoreRequestsFromDb(supabaseUrl, serviceRoleKey),
    ]);

    const { resolvedRequestIds } = buildStoreRequestResolution(storeRequests, [strategy]);

    for (const resolvedRequestId of resolvedRequestIds) {
      const emptyPayload = buildEmptyPayload(resolvedRequestId);
      await sendToSheets(SHEETS_WEBHOOK_URL, emptyPayload);
    }

    const sheetsPayload = buildPayloadFromRow(
      strategy,
      operationalManagerMap[strategy.assigned_to] || strategy.operational_manager,
      storeCreatedAtMap[strategy.store_request_id] || "",
    );

    const { result } = await sendToSheets(SHEETS_WEBHOOK_URL, sheetsPayload);
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

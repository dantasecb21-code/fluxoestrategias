import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Soft-delete strategies older than 90 days that are 100% completed
  // NEVER permanently delete — only mark as deleted (soft delete)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const { data: strategies } = await supabase
    .from("strategies")
    .select("id, categories, updated_at")
    .is("deleted_at", null)
    .lt("updated_at", cutoffDate.toISOString());

  let archivedCount = 0;

  if (strategies) {
    for (const s of strategies) {
      const cats = s.categories as any[];
      const allItems = cats.flatMap((c: any) => c.items || []).filter((i: any) => i.checked);
      if (allItems.length > 0) {
        const allCompleted = allItems.every((i: any) => i.status === "completed");
        if (allCompleted) {
          // Soft delete only — never permanently remove
          await supabase.from("strategies").update({ deleted_at: new Date().toISOString() }).eq("id", s.id);
          archivedCount++;
        }
      }
    }
  }

  return new Response(JSON.stringify({ 
    message: `Cleanup complete. Archived ${archivedCount} old completed strategies (soft delete only).`,
    timestamp: new Date().toISOString()
  }), {
    headers: { "Content-Type": "application/json" },
  });
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Delete strategies older than 90 days that are 100% completed
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const { data: strategies } = await supabase
    .from("strategies")
    .select("id, categories, updated_at")
    .lt("updated_at", cutoffDate.toISOString());

  let deletedCount = 0;

  if (strategies) {
    for (const s of strategies) {
      const cats = s.categories as any[];
      const allItems = cats.flatMap((c: any) => c.items || []).filter((i: any) => i.checked);
      if (allItems.length > 0) {
        const allCompleted = allItems.every((i: any) => i.status === "completed");
        if (allCompleted) {
          await supabase.from("strategies").delete().eq("id", s.id);
          deletedCount++;
        }
      }
    }
  }

  return new Response(JSON.stringify({ 
    message: `Cleanup complete. Deleted ${deletedCount} old completed strategies.`,
    timestamp: new Date().toISOString()
  }), {
    headers: { "Content-Type": "application/json" },
  });
});

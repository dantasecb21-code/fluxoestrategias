import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Trophy, Crown, Medal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { shortName } from "@/lib/utils";

interface Row {
  user_id: string;
  display_name: string;
  avatar_url: string;
  done: number;
  returned: number;
  inAdaptation: number;
  completedAfterApproval: number;
  approvalRate: number;
}

function ymOptions() {
  const opts: { value: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const value = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ value, label: dt.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) });
  }
  return opts;
}

export default function StrategistRanking() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const months = useMemo(ymOptions, []);
  const [month, setMonth] = useState(months[0].value);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [year, m] = month.split("-").map(Number);
      const start = new Date(year, m - 1, 1).toISOString();
      const end = new Date(year, m, 1).toISOString();

      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "strategic");
      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length === 0) { setRows([]); setLoading(false); return; }

      const { data: profiles } = await supabase
        .from("profiles").select("user_id, display_name, avatar_url").in("user_id", ids).eq("approved", true);

      const { data: strategies } = await supabase
        .from("strategies")
        .select("user_id, status, algorithm_adaptation_status, algorithm_approved_at, completed_at, updated_at")
        .in("user_id", ids)
        .is("deleted_at", null);

      const inMonth = (iso?: string | null) => !!iso && iso >= start && iso < end;

      const rowsCalc: Row[] = (profiles || []).map((p: any) => {
        const own = (strategies || []).filter((s: any) => s.user_id === p.user_id);
        const done = own.filter((s) => inMonth(s.completed_at)).length;
        const returned = own.filter((s) => s.algorithm_adaptation_status === "returned" && inMonth(s.updated_at)).length;
        const inAdaptation = own.filter((s) => s.algorithm_adaptation_status === "pending").length;
        const completedAfterApproval = own.filter((s) => s.algorithm_adaptation_status === "approved" && inMonth(s.algorithm_approved_at)).length;
        const totalReview = completedAfterApproval + returned;
        const approvalRate = totalReview > 0 ? Math.round((completedAfterApproval / totalReview) * 100) : 0;
        return {
          user_id: p.user_id,
          display_name: p.display_name || "—",
          avatar_url: p.avatar_url || "",
          done, returned, inAdaptation, completedAfterApproval, approvalRate,
        };
      }).sort((a, b) => b.completedAfterApproval - a.completedAfterApproval || b.done - a.done);

      setRows(rowsCalc);
      setLoading(false);
    })();
  }, [month]);

  const positionIcon = (i: number) => {
    if (i === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (i === 1) return <Medal className="h-5 w-5 text-slate-300" />;
    if (i === 2) return <Medal className="h-5 w-5 text-amber-700" />;
    return <span className="text-muted-foreground text-sm font-semibold">{i + 1}º</span>;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <Trophy className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Ranking <span className="text-primary">Estrategistas</span>
          </h1>
          <p className="text-sm text-muted-foreground">Produtividade mensal por estrategista.</p>
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground">Nenhum estrategista encontrado.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Estrategista</th>
                  <th className="p-3 text-center">Feitas</th>
                  <th className="p-3 text-center">Devolvidas</th>
                  <th className="p-3 text-center">Em adaptação</th>
                  <th className="p-3 text-center">Concluídas após aprov.</th>
                  <th className="p-3 text-center">Taxa de aprovação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.user_id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3 w-12">{positionIcon(i)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                          {r.avatar_url
                            ? <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                            : <span className="text-xs font-bold text-muted-foreground">{r.display_name.charAt(0).toUpperCase()}</span>}
                        </div>
                        <span className="font-medium text-foreground">{shortName(r.display_name)}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center font-semibold">{r.done}</td>
                    <td className="p-3 text-center text-destructive">{r.returned}</td>
                    <td className="p-3 text-center">{r.inAdaptation}</td>
                    <td className="p-3 text-center text-success font-semibold">{r.completedAfterApproval}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                        r.approvalRate >= 80 ? "bg-success/20 text-success" :
                        r.approvalRate >= 50 ? "bg-warning/20 text-warning" :
                        "bg-destructive/20 text-destructive"
                      }`}>{r.approvalRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
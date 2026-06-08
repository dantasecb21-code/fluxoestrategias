import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Play, CheckCircle2, Clock, Store, User, RotateCcw } from "lucide-react";
import { useCompetitorStudies, CompetitorStudy } from "@/hooks/useCompetitorStudies";
import { toast } from "sonner";

const PLATFORM_LABELS: Record<string, string> = { ifood: "iFood", "99food": "99", keeta: "Keeta" };

// Adds N calendar days
function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Pushes weekend deadlines to the next Monday
function adjustWeekendToMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 6 = Sat
  if (day === 6) d.setDate(d.getDate() + 2); // Sat -> Mon
  else if (day === 0) d.setDate(d.getDate() + 1); // Sun -> Mon
  return d;
}

// Counts calendar days between two dates (sign preserved; same day = 0)
function daysBetween(from: Date, to: Date) {
  const a = new Date(from); a.setHours(0, 0, 0, 0);
  const b = new Date(to); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

type Priority = "overdue" | "high" | "medium" | "low" | "done_on_time" | "done_late";

function getDeadlineInfo(createdAt: string, completedAt: string | null) {
  const created = new Date(createdAt);
  const deadline = adjustWeekendToMonday(addDays(created, 3));
  const ref = completedAt ? new Date(completedAt) : new Date();
  const diffBd = daysBetween(ref, deadline);
  const deadlineLabel = deadline.toLocaleDateString("pt-BR");

  if (completedAt) {
    const onTime = ref.getTime() <= deadline.getTime();
    return {
      label: `Prazo: ${deadlineLabel} (entregue ${onTime ? "no prazo" : "atrasado"})`,
      className: onTime ? "text-success" : "text-destructive",
      priority: (onTime ? "done_on_time" : "done_late") as Priority,
      priorityLabel: onTime ? "Entregue no prazo" : "Entregue atrasado",
      priorityClass: onTime
        ? "bg-success/20 text-success border-success/30"
        : "bg-destructive/20 text-destructive border-destructive/30",
    };
  }

  if (ref.getTime() > deadline.getTime()) {
    const daysLate = Math.abs(diffBd);
    return {
      label: `Atrasado ${daysLate} dia${daysLate === 1 ? "" : "s"} (prazo ${deadlineLabel})`,
      className: "text-destructive font-medium",
      priority: "overdue" as Priority,
      priorityLabel: "Atrasado",
      priorityClass: "bg-destructive/20 text-destructive border-destructive/40",
    };
  }
  if (diffBd <= 0) {
    return {
      label: `Vence hoje (prazo ${deadlineLabel})`,
      className: "text-warning font-medium",
      priority: "high" as Priority,
      priorityLabel: "Alta",
      priorityClass: "bg-warning/20 text-warning border-warning/40",
    };
  }
  if (diffBd === 1) {
    return {
      label: `Prazo: ${deadlineLabel} (1 dia restante)`,
      className: "text-warning",
      priority: "high" as Priority,
      priorityLabel: "Alta",
      priorityClass: "bg-warning/20 text-warning border-warning/40",
    };
  }
  if (diffBd === 2) {
    return {
      label: `Prazo: ${deadlineLabel} (2 dias restantes)`,
      className: "text-muted-foreground",
      priority: "medium" as Priority,
      priorityLabel: "Média",
      priorityClass: "bg-info/20 text-info border-info/40",
    };
  }
  return {
    label: `Prazo: ${deadlineLabel} (${diffBd} dias restantes)`,
    className: "text-muted-foreground",
    priority: "low" as Priority,
    priorityLabel: "Baixa",
    priorityClass: "bg-muted text-muted-foreground border-border",
  };
}

const PRIORITY_ORDER: Record<Priority, number> = {
  overdue: 0, high: 1, medium: 2, low: 3, done_on_time: 4, done_late: 5,
};

export default function CompetitorStudies() {
  const { studies, loading, startStudy, completeStudy, resetToPending } = useCompetitorStudies();
  const [completing, setCompleting] = useState<CompetitorStudy | null>(null);
  const [notes, setNotes] = useState("");
  const [strategistNames, setStrategistNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = [...new Set([
      ...studies.map((s) => s.strategic_user_id),
      ...studies.map((s) => s.completed_by),
    ].filter(Boolean) as string[])];
    const missing = ids.filter((id) => !(id in strategistNames));
    if (missing.length === 0) return;
    supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", missing)
      .then(({ data }) => {
        if (!data) return;
        setStrategistNames((prev) => ({
          ...prev,
          ...Object.fromEntries(data.map((p: any) => [p.user_id, p.display_name])),
        }));
      });
  }, [studies, strategistNames]);

  const grouped = useMemo(() => ({
    pending: [...studies.filter((s) => s.status === "pending")].sort(
      (a, b) => PRIORITY_ORDER[getDeadlineInfo(a.created_at, a.completed_at).priority]
              - PRIORITY_ORDER[getDeadlineInfo(b.created_at, b.completed_at).priority]
    ),
    in_progress: [...studies.filter((s) => s.status === "in_progress")].sort(
      (a, b) => PRIORITY_ORDER[getDeadlineInfo(a.created_at, a.completed_at).priority]
              - PRIORITY_ORDER[getDeadlineInfo(b.created_at, b.completed_at).priority]
    ),
    completed: studies.filter((s) => s.status === "completed"),
  }), [studies]);

  const handleStart = async (s: CompetitorStudy) => {
    const ok = await startStudy(s.id);
    ok ? toast.success("Estudo iniciado") : toast.error("Erro ao iniciar");
  };

  const handleComplete = async () => {
    if (!completing) return;
    const ok = await completeStudy(completing.id, notes);
    if (ok) { toast.success("Estudo concluído"); setCompleting(null); setNotes(""); }
    else toast.error("Erro ao concluir");
  };
  
  const handleResetToPending = async (s: CompetitorStudy) => {
    const ok = await resetToPending(s.id);
    ok ? toast.success("Estudo retornado para pendente") : toast.error("Erro ao retornar para pendente");
  };

  const StudyCard = ({ s }: { s: CompetitorStudy }) => {
    const info = getDeadlineInfo(s.created_at, s.completed_at);
    return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Store className="h-4 w-4 text-primary shrink-0" />
            <p className="font-semibold text-foreground truncate">{s.store_name || "Sem nome"}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Criado em {new Date(s.created_at).toLocaleDateString("pt-BR")}
          </p>
          {strategistNames[s.strategic_user_id] && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <User className="h-3 w-3" />
              Estrategista: {strategistNames[s.strategic_user_id]}
            </p>
          )}
          <p className={`text-xs flex items-center gap-1 mt-1 ${info.className}`}>
            <Clock className="h-3 w-3" />
            {info.label}
          </p>
          {s.notes && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">{s.notes}</p>
          )}
          {s.competitors && (
            <div className="mt-2 text-xs bg-muted/40 border border-border rounded p-2">
              <p className="font-semibold text-foreground mb-1">Concorrentes informados:</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{s.competitors}</p>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className={info.priorityClass}>
            Prioridade: {info.priorityLabel}
          </Badge>
          <Badge variant="outline">{PLATFORM_LABELS[s.platform] || s.platform}</Badge>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        {s.status === "pending" && (
          <Button size="sm" onClick={() => handleStart(s)}>
            <Play className="h-4 w-4 mr-1" /> Iniciar
          </Button>
        )}
        {s.status === "in_progress" && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleResetToPending(s)}
              title="Voltar para pendente">
              <RotateCcw className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <Button size="sm" onClick={() => { setCompleting(s); setNotes(s.notes || ""); }}
              className="bg-success hover:bg-success/90 text-success-foreground">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar como feito
            </Button>
          </div>
        )}
        {s.status === "completed" && s.completed_at && (
          <span className="text-xs text-muted-foreground text-right">
            Concluído em {new Date(s.completed_at).toLocaleDateString("pt-BR")}
            {s.completed_by && strategistNames[s.completed_by] && (
              <> por {strategistNames[s.completed_by]}</>
            )}
          </span>
        )}
      </div>
    </Card>
    );
  };

  const Empty = ({ msg }: { msg: string }) => (
    <Card className="p-8 text-center border-dashed">
      <p className="text-muted-foreground text-sm">{msg}</p>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <Search className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Estudo de <span className="text-primary">Concorrência</span>
          </h1>
          <p className="text-sm text-muted-foreground">Demandas de análise para cada loja nova.</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              <Clock className="h-4 w-4 mr-1" /> Pendentes ({grouped.pending.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              <Play className="h-4 w-4 mr-1" /> Em andamento ({grouped.in_progress.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Concluídas ({grouped.completed.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {grouped.pending.length === 0 ? <Empty msg="Nada pendente." /> : grouped.pending.map((s) => <StudyCard key={s.id} s={s} />)}
          </TabsContent>
          <TabsContent value="in_progress" className="space-y-3 mt-4">
            {grouped.in_progress.length === 0 ? <Empty msg="Nada em andamento." /> : grouped.in_progress.map((s) => <StudyCard key={s.id} s={s} />)}
          </TabsContent>
          <TabsContent value="completed" className="space-y-3 mt-4">
            {grouped.completed.length === 0 ? <Empty msg="Nada concluído ainda." /> : grouped.completed.map((s) => <StudyCard key={s.id} s={s} />)}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!completing} onOpenChange={(o) => { if (!o) { setCompleting(null); setNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir estudo: {completing?.store_name}</DialogTitle>
          </DialogHeader>
          <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações do estudo (opcional)" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompleting(null)}>Cancelar</Button>
            <Button onClick={handleComplete} className="bg-success hover:bg-success/90 text-success-foreground">
              Marcar como feito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
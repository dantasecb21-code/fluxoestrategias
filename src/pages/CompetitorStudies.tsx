import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Play, CheckCircle2, Clock, Store, User } from "lucide-react";
import { useCompetitorStudies, CompetitorStudy } from "@/hooks/useCompetitorStudies";
import { toast } from "sonner";

const PLATFORM_LABELS: Record<string, string> = { ifood: "iFood", "99food": "99", keeta: "Keeta" };

function getDeadlineInfo(createdAt: string, completedAt: string | null) {
  const created = new Date(createdAt);
  const deadline = new Date(created.getTime() + 3 * 24 * 60 * 60 * 1000);
  const ref = completedAt ? new Date(completedAt) : new Date();
  const diffMs = deadline.getTime() - ref.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const deadlineLabel = deadline.toLocaleDateString("pt-BR");
  if (completedAt) {
    return { label: `Prazo: ${deadlineLabel} (entregue ${diffMs >= 0 ? "no prazo" : "atrasado"})`, className: diffMs >= 0 ? "text-success" : "text-destructive" };
  }
  if (diffMs < 0) {
    const daysLate = Math.abs(diffDays);
    return { label: `Atrasado ${daysLate}d (prazo ${deadlineLabel})`, className: "text-destructive font-medium" };
  }
  if (diffDays <= 1) {
    return { label: `Vence hoje (prazo ${deadlineLabel})`, className: "text-warning font-medium" };
  }
  return { label: `Prazo: ${deadlineLabel} (${diffDays}d restantes)`, className: "text-muted-foreground" };
}

export default function CompetitorStudies() {
  const { studies, loading, startStudy, completeStudy } = useCompetitorStudies();
  const [completing, setCompleting] = useState<CompetitorStudy | null>(null);
  const [notes, setNotes] = useState("");
  const [strategistNames, setStrategistNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = [...new Set(studies.map((s) => s.strategic_user_id).filter(Boolean))];
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
    pending: studies.filter((s) => s.status === "pending"),
    in_progress: studies.filter((s) => s.status === "in_progress"),
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

  const StudyCard = ({ s }: { s: CompetitorStudy }) => (
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
          {(() => {
            const info = getDeadlineInfo(s.created_at, s.completed_at);
            return (
              <p className={`text-xs flex items-center gap-1 mt-1 ${info.className}`}>
                <Clock className="h-3 w-3" />
                {info.label}
              </p>
            );
          })()}
          {s.notes && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">{s.notes}</p>
          )}
        </div>
        <Badge variant="outline">{PLATFORM_LABELS[s.platform] || s.platform}</Badge>
      </div>
      <div className="flex gap-2 justify-end">
        {s.status === "pending" && (
          <Button size="sm" onClick={() => handleStart(s)}>
            <Play className="h-4 w-4 mr-1" /> Iniciar
          </Button>
        )}
        {s.status === "in_progress" && (
          <Button size="sm" onClick={() => { setCompleting(s); setNotes(s.notes || ""); }}
            className="bg-success hover:bg-success/90 text-success-foreground">
            <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar como feito
          </Button>
        )}
        {s.status === "completed" && s.completed_at && (
          <span className="text-xs text-muted-foreground">
            Concluído em {new Date(s.completed_at).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
    </Card>
  );

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
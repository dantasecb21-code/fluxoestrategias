import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDbStrategies, DbStrategy } from "@/hooks/useDbStrategies";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Copy, Pencil, Trash2, FileText, Zap, Clock, UserCheck, Undo2, ChevronDown, ChevronRight, CheckCircle2, X, Search, ShieldCheck } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDateBR, shortName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { deriveStrategyDisplayStatus, getStatusLabel, getStatusBadgeProps } from "@/lib/strategyStatus";
import { toast } from "sonner";
import { PlatformBadge } from "@/components/PlatformBadge";
import { useAuth } from "@/hooks/useAuth";

function calcProgress(categories: any[]) {
  const allItems = categories.flatMap((c: any) => c.items);
  if (allItems.length === 0) return { percent: 0, completed: 0, inProgress: 0, pending: 0, total: 0 };
  const completed = allItems.filter((i: any) => i.status === "completed").length;
  const inProgress = allItems.filter((i: any) => i.status === "in_progress").length;
  const pending = allItems.filter((i: any) => !i.status || i.status === "pending").length;
  const total = allItems.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { percent, completed, inProgress, pending, total };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { strategies, loading, deleteStrategy, duplicateStrategy, restoreStrategy, fetchDeletedStrategies, permanentDeleteStrategy } = useDbStrategies();
  const isStrategicAssistant = role === "strategic_assistant";
  const isAdmin = role === "admin";
  const isStrategic = role === "strategic";
  const [showTrash, setShowTrash] = useState(false);
  const [deletedStrategies, setDeletedStrategies] = useState<DbStrategy[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterManager, setFilterManager] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterCompetition, setFilterCompetition] = useState("all");

  const operationalManagers = useMemo(() => {
    const names = [...new Set(strategies.map((s) => s.operational_manager).filter(Boolean))];
    return names.sort();
  }, [strategies]);

  const filterStrategies = (list: DbStrategy[]) => {
    return list.filter((s) => {
      const matchSearch = !searchTerm || s.store_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchManager = filterManager === "all" || s.operational_manager === filterManager;
      const matchPlatform = filterPlatform === "all" || s.platform === filterPlatform;
      const hasStudy = s.observation?.toLowerCase().includes("estudo de concorrência") || false;
      const matchCompetition = filterCompetition === "all" || 
                              (filterCompetition === "yes" ? hasStudy : !hasStudy);
      return matchSearch && matchManager && matchPlatform && matchCompetition;
    });
  };

  const sortByPriority = (list: DbStrategy[]) =>
    [...list].sort((a, b) => {
      const aReturned = deriveStrategyDisplayStatus(a) === "returned" ? 0 : 1;
      const bReturned = deriveStrategyDisplayStatus(b) === "returned" ? 0 : 1;
      if (aReturned !== bReturned) return aReturned - bReturned;
      const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return dateA - dateB;
    });

  const activeStrategies = sortByPriority(
    filterStrategies(
      strategies.filter((s) => {
        const ds = deriveStrategyDisplayStatus(s);
        if (ds === "completed") return false;
        // "Aguardando validação" tem sua própria seção (admin/estrategista dono)
        if (ds === "pending_admin_approval" && (isAdmin || (isStrategic && s.user_id === user?.id))) return false;
        return true;
      })
    )
  );
  const completedStrategies = filterStrategies(strategies.filter((s) => deriveStrategyDisplayStatus(s) === "completed"));

  // "Aguardando validação" — admin vê todas, estrategista vê só as que ele criou
  const awaitingValidation = useMemo(() => {
    if (!isAdmin && !isStrategic) return [];
    return filterStrategies(
      strategies.filter((s) => {
        if (s.status !== "pending_admin_approval") return false;
        if (isStrategic && s.user_id !== user?.id) return false;
        return true;
      })
    );
  }, [strategies, isAdmin, isStrategic, user?.id, searchTerm, filterManager, filterPlatform]);

  const toggleTrash = async () => {
    if (!showTrash) {
      setLoadingTrash(true);
      const deleted = await fetchDeletedStrategies();
      setDeletedStrategies(deleted);
      setLoadingTrash(false);
    }
    setShowTrash(!showTrash);
  };

  const handleRestore = async (id: string) => {
    await restoreStrategy(id);
    setDeletedStrategies((prev) => prev.filter((s) => s.id !== id));
    toast.success("Estratégia restaurada!");
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente? Esta ação não pode ser desfeita.")) return;
    await permanentDeleteStrategy(id);
    setDeletedStrategies((prev) => prev.filter((s) => s.id !== id));
    toast.success("Estratégia excluída permanentemente!");
  };
  const renderStrategyCard = (s: DbStrategy) => {
    const progress = calcProgress(s.categories);
    const displayStatus = deriveStrategyDisplayStatus(s);
    const statusLabel = getStatusLabel(displayStatus);
    const badgeProps = getStatusBadgeProps(displayStatus);
    const isApproved = displayStatus === "completed";
    const isReturned = displayStatus === "returned";
    return (
      <Card
        key={s.id}
        className={`p-5 hover:border-primary/30 transition-colors cursor-pointer ${isApproved ? "border-success/30 bg-success/5" : ""} ${isReturned ? "border-destructive/40 bg-destructive/5" : ""}`}
        onClick={() => navigate(`/estrategia/${s.id}`)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-semibold text-foreground text-lg flex items-center gap-2 min-w-0">
              <span className="truncate">{s.store_name || "Sem nome"}</span>
              <Badge variant={badgeProps.variant} className={`text-[10px] py-0 px-1.5 h-4 leading-none shrink-0 ${badgeProps.className}`}>{statusLabel}</Badge>
              <PlatformBadge platform={s.platform} />
              {s.observation && (
                <span className="shrink-0 text-[10px] py-0 px-1.5 h-4 leading-none rounded-full bg-warning/20 text-warning border border-warning/30 flex items-center" title={s.observation}>📌 Obs</span>
              )}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
              {s.operational_manager && (
                <span className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3" /> {shortName(s.operational_manager)}
                </span>
              )}
              {s.deadline && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Prazo: {formatDateBR(s.deadline)}
                </span>
              )}
              <span>{new Date(s.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(`/estrategia/${s.id}`)}>
              <Pencil className="h-4 w-4" />
            </Button>
            {!isStrategicAssistant && (
              <>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={async () => {
                    const dup = await duplicateStrategy(s.id);
                    if (dup) navigate(`/estrategia/${dup.id}`);
                  }}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteStrategy(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        {progress.total > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Execução</span>
              <span className="font-medium text-foreground">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} className="h-1.5" />
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="text-success">{progress.completed} concluídos</span>
              <span className="text-info">{progress.inProgress} em andamento</span>
              <span className="text-warning">{progress.pending} pendentes</span>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Fluxo de <span className="text-primary">Estratégias</span>
          </h1>
        </div>
        <p className="text-muted-foreground">
          Construtor inteligente de estratégias — crie, atribua e acompanhe a execução.
        </p>
        {!isStrategicAssistant && (
          <Button onClick={() => navigate("/nova")} className="mt-4" size="lg">
            <Plus className="h-5 w-5 mr-2" /> Nova Estratégia
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      {strategies.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar loja..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterManager} onValueChange={setFilterManager}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filtrar por gestor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os gestores</SelectItem>
              {operationalManagers.map((name) => (
                <SelectItem key={name} value={name}>{shortName(name)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas plataformas</SelectItem>
              <SelectItem value="99food">99Food</SelectItem>
              <SelectItem value="ifood">iFood</SelectItem>
              <SelectItem value="keeta">Keeta</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCompetition} onValueChange={setFilterCompetition}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Estudo de concorrência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estudos</SelectItem>
              <SelectItem value="yes">Com estudo</SelectItem>
              <SelectItem value="no">Sem estudo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : strategies.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Nenhuma estratégia criada</h2>
          <p className="text-muted-foreground mb-6">Nenhuma estratégia disponível para acompanhamento.</p>
          {!isStrategicAssistant && (
            <Button onClick={() => navigate("/nova")}>
              <Plus className="h-4 w-4 mr-2" /> Criar primeira estratégia
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Aguardando validação do administrador */}
          {(isAdmin || isStrategic) && awaitingValidation.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-400" />
                Aguardando validação ({awaitingValidation.length})
              </h2>
              {awaitingValidation.map((s) => renderStrategyCard(s))}
            </div>
          )}

          {/* Active strategies */}
          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Estratégias ({activeStrategies.length})
            </h2>
            {activeStrategies.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-1">Nenhuma estratégia ativa no momento.</p>
            ) : (
              activeStrategies.map((s) => renderStrategyCard(s))
            )}
          </div>

          {/* Completed strategies - collapsible */}
          {completedStrategies.length > 0 && (
            <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 font-heading font-semibold text-lg text-foreground hover:text-primary transition-colors w-full text-left">
                  {showCompleted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Concluídas ({completedStrategies.length})
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {completedStrategies.map((s) => renderStrategyCard(s))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {/* Lixeira */}
      {!isStrategicAssistant && <div className="mt-8">
        <Button variant="ghost" onClick={toggleTrash} className="text-muted-foreground hover:text-foreground gap-2">
          {showTrash ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Trash2 className="h-4 w-4" />
          Lixeira
        </Button>

        {showTrash && (
          <div className="mt-3 space-y-2">
            {loadingTrash ? (
              <p className="text-sm text-muted-foreground pl-4">Carregando...</p>
            ) : deletedStrategies.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-4">Nenhuma estratégia na lixeira.</p>
            ) : (
              deletedStrategies.map((s) => (
                <Card key={s.id} className="p-4 border-dashed opacity-70">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">{s.store_name || "Sem nome"}</h4>
                      <p className="text-xs text-muted-foreground">
                        Excluída em {s.deleted_at ? new Date(s.deleted_at).toLocaleDateString("pt-BR") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRestore(s.id)} className="gap-1.5">
                        <Undo2 className="h-3.5 w-3.5" /> Restaurar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handlePermanentDelete(s.id)} className="gap-1.5">
                        <X className="h-3.5 w-3.5" /> Excluir
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>}
    </div>
  );
}

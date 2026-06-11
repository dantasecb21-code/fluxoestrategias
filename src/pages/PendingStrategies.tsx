import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { deriveStrategyDisplayStatus, getStatusLabel, getStatusBadgeProps } from "@/lib/strategyStatus";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, AlertTriangle, UserCheck, Eye, Search, Filter, CalendarIcon, X } from "lucide-react";
import { formatDateBR, shortName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import OverdueAlert from "@/components/OverdueAlert";
import { PlatformBadge } from "@/components/PlatformBadge";

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

export default function PendingStrategies() {
  const navigate = useNavigate();
  const { strategies, loading } = useDbStrategies();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterManager, setFilterManager] = useState("all");
  const [filterStrategist, setFilterStrategist] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [strategistNames, setStrategistNames] = useState<Record<string, string>>({});

  const allPending = useMemo(() =>
    strategies
      .filter((s) => deriveStrategyDisplayStatus(s) !== "completed")
      .sort((a, b) => {
        const aReturned = deriveStrategyDisplayStatus(a) === "returned" ? 0 : 1;
        const bReturned = deriveStrategyDisplayStatus(b) === "returned" ? 0 : 1;
        if (aReturned !== bReturned) return aReturned - bReturned;
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return dateA - dateB;
      }),
    [strategies]
  );

  const operationalManagers = useMemo(() => {
    const names = [...new Set(allPending.map((s) => s.operational_manager).filter(Boolean))];
    return names.sort();
  }, [allPending]);

  const strategistIds = useMemo(() => {
    return [...new Set(allPending.map((s) => s.user_id).filter(Boolean))];
  }, [allPending]);

  useEffect(() => {
    if (strategistIds.length === 0) return;
    supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", strategistIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((p) => { map[p.user_id] = p.display_name; });
          setStrategistNames(map);
        }
      });
  }, [strategistIds]);

  // Collect deadline dates filtered by selected manager
  const deadlineDates = useMemo(() => {
    const dates: Date[] = [];
    allPending.forEach((s) => {
      if (!s.deadline) return;
      if (filterManager !== "all" && s.operational_manager !== filterManager) return;
      dates.push(parseISO(s.deadline));
    });
    return dates;
  }, [allPending, filterManager]);

  const pendingStrategies = useMemo(() => {
    return allPending.filter((s) => {
      if (searchTerm && !s.store_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterManager !== "all" && s.operational_manager !== filterManager) return false;
      if (filterStrategist !== "all" && s.user_id !== filterStrategist) return false;
      if (filterPlatform !== "all" && s.platform !== filterPlatform) return false;
      if (filterStatus !== "all") {
        const ds = deriveStrategyDisplayStatus(s);
        if (filterStatus !== ds) return false;
      }
      if (filterDate && s.deadline) {
        const deadlineDate = parseISO(s.deadline);
        if (!isSameDay(deadlineDate, filterDate)) return false;
      } else if (filterDate && !s.deadline) {
        return false;
      }
      return true;
    });
  }, [allPending, searchTerm, filterManager, filterStrategist, filterStatus, filterDate, filterPlatform]);

  const hasActiveFilters = searchTerm || filterManager !== "all" || filterStrategist !== "all" || filterStatus !== "all" || !!filterDate || filterPlatform !== "all";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-warning/20 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Estratégias <span className="text-primary">Pendentes</span>
          </h1>
        </div>
        <p className="text-muted-foreground">
          Acompanhe todas as estratégias que ainda não foram concluídas.
        </p>
      </div>

      {/* Filters */}
      {allPending.length > 0 && (
        <div className="space-y-3">
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
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Gestor Operacional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os gestores</SelectItem>
                {operationalManagers.map((name) => (
                  <SelectItem key={name} value={name}>{shortName(name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStrategist} onValueChange={setFilterStrategist}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Estrategista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos estrategistas</SelectItem>
                {strategistIds.map((id) => (
                  <SelectItem key={id} value={id}>{shortName(strategistNames[id] || id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="pending_approval">Aguardando aprovação</SelectItem>
                <SelectItem value="returned">Devolvida</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[200px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDate ? format(filterDate, "dd/MM/yyyy") : "Filtrar por data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  locale={ptBR}
                  modifiers={{ hasDeadline: deadlineDates }}
                  modifiersClassNames={{ hasDeadline: "bg-primary/20 font-bold text-primary" }}
                />
              </PopoverContent>
            </Popover>
            {filterDate && (
              <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => setFilterDate(undefined)}>
                <X className="h-4 w-4" />
              </Button>
            )}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground self-center"
                onClick={() => {
                  setSearchTerm("");
                  setFilterManager("all");
                  setFilterStrategist("all");
                  setFilterStatus("all");
                  setFilterDate(undefined);
                  setFilterPlatform("all");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : allPending.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Nenhuma estratégia pendente</h2>
          <p className="text-muted-foreground">Todas as estratégias estão concluídas!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {!hasActiveFilters && <OverdueAlert strategies={allPending} />}
          <p className="text-sm text-muted-foreground mb-4">
            {pendingStrategies.length} estratégia(s) {hasActiveFilters ? "encontrada(s)" : "em andamento"}
          </p>
          {pendingStrategies.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma estratégia encontrada com os filtros selecionados.</p>
            </Card>
          ) : (
            pendingStrategies.map((s) => {
              const progress = calcProgress(s.categories);
              const isOverdue = s.deadline && new Date(s.deadline) < new Date();
              return (
                <Card
                  key={s.id}
                  className={`p-5 hover:border-primary/30 transition-colors cursor-pointer ${isOverdue ? "border-destructive/30" : ""}`}
                  onClick={() => navigate(`/estrategia/${s.id}`)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading font-semibold text-foreground text-lg truncate flex items-center gap-2">
                        {s.store_name || "Sem nome"}
                        <PlatformBadge platform={s.platform} />
                        {isOverdue && (
                          <span className="h-2 w-2 rounded-full bg-destructive shrink-0" title="Atrasada" />
                        )}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        {s.operational_manager && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3" /> {shortName(s.operational_manager)}
                          </span>
                        )}
                        {s.deadline && (
                          <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive" : ""}`}>
                            <Clock className="h-3 w-3" /> Prazo: {formatDateBR(s.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      {(() => {
                        const ds = deriveStrategyDisplayStatus(s);
                        const badgeProps = getStatusBadgeProps(ds);
                        return (
                          <Badge variant={badgeProps.variant} className={badgeProps.className + " text-[10px] h-5 leading-none"}>
                            {getStatusLabel(ds)}
                          </Badge>
                        );
                      })()}
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/estrategia/${s.id}`); }}>
                        <Eye className="h-4 w-4 mr-1" /> Ver
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Execução</span>
                      <span className="font-medium text-foreground">{progress.percent}%</span>
                    </div>
                    <Progress value={progress.percent} className="h-1.5" />
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="text-success">{progress.completed} concluídos</span>
                      <span className="text-primary">{progress.inProgress} em andamento</span>
                      <span className="text-warning">{progress.pending} pendentes</span>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

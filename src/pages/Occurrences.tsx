import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Plus, CheckCircle2, Clock, User, Store, Trash2, RotateCcw, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { shortName } from "@/lib/utils";

interface Occurrence {
  id: string;
  store_id: string;
  occurrence_date: string;
  occurrence_time: string;
  description: string;
  operational_manager_id: string;
  operational_manager_name: string;
  creator_role: string;
  sector: string;
  status: string;
  resolution: string;
  resolved_by: string | null;
  resolved_by_name: string;
  resolved_at: string | null;
  created_at: string;
  possible_solution: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  strategic: "Estratégico",
  strategic_assistant: "Auxiliar Estratégico",
  operational: "Operacional",
};

const SECTORS = ["99", "iFood"];

export default function Occurrences() {
  const { user, role, displayName } = useAuth();
  const isOperational = role === "operational";
  const canResolve = role === "admin" || role === "strategic" || role === "strategic_assistant";
  const isAdmin = role === "admin";

  const [items, setItems] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // create form
  const [storeId, setStoreId] = useState("");
  const [occDate, setOccDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [occTime, setOccTime] = useState(format(new Date(), "HH:mm"));
  const [description, setDescription] = useState("");
  const [possibleSolution, setPossibleSolution] = useState("");
  const [sector, setSector] = useState<string>("99");

  // resolve dialog
  const [resolveTarget, setResolveTarget] = useState<Occurrence | null>(null);
  const [resolution, setResolution] = useState("");

  // filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("occurrences" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar ocorrências.");
    } else if (data) {
      setItems(data as unknown as Occurrence[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel("occurrences-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "occurrences" }, () => {
        fetchItems();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setStoreId("");
    setOccDate(format(new Date(), "yyyy-MM-dd"));
    setOccTime(format(new Date(), "HH:mm"));
    setDescription("");
    setPossibleSolution("");
    setSector("99");
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!storeId.trim() || !description.trim()) {
      toast.error("Preencha ID da loja e descrição.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("occurrences" as any).insert({
      store_id: storeId.trim(),
      occurrence_date: occDate,
      occurrence_time: occTime,
      description: description.trim(),
      possible_solution: possibleSolution.trim(),
      operational_manager_id: user.id,
      operational_manager_name: displayName || "",
      creator_role: role || "operational",
      sector,
    } as any);
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao registrar ocorrência.");
    } else {
      toast.success("Ocorrência registrada!");
      resetForm();
      setDialogOpen(false);
      fetchItems();
    }
  };

  const handleResolve = async () => {
    if (!resolveTarget || !user) return;
    if (!resolution.trim()) {
      toast.error("Escreva a resposta.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("occurrences" as any)
      .update({
        status: "resolved",
        resolution: resolution.trim(),
        resolved_by: user.id,
        resolved_by_name: displayName || "",
        resolved_at: new Date().toISOString(),
      } as any)
      .eq("id", resolveTarget.id);
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao resolver ocorrência.");
    } else {
      toast.success("Ocorrência resolvida!");
      setResolveTarget(null);
      setResolution("");
      fetchItems();
    }
  };

  const handleReopen = async (occ: Occurrence) => {
    const { error } = await supabase
      .from("occurrences" as any)
      .update({ status: "open", resolution: "", resolved_by: null, resolved_by_name: "", resolved_at: null } as any)
      .eq("id", occ.id);
    if (error) {
      toast.error("Erro ao reabrir.");
    } else {
      toast.success("Ocorrência reaberta.");
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("occurrences" as any).delete().eq("id", id);
    if (error) toast.error("Erro ao excluir.");
    else {
      toast.success("Excluída.");
      fetchItems();
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((o) => {
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      const matchSector = sectorFilter === "all" || (o.sector || "Operacional") === sectorFilter;
      const matchCreator = creatorFilter.length === 0 || creatorFilter.includes(o.operational_manager_id);
      const matchTerm =
        !term ||
        o.store_id.toLowerCase().includes(term) ||
        o.description.toLowerCase().includes(term) ||
        o.operational_manager_name.toLowerCase().includes(term);
      return matchStatus && matchSector && matchCreator && matchTerm;
    });
  }, [items, statusFilter, search, sectorFilter, creatorFilter]);

  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((o) => {
      if (!map.has(o.operational_manager_id)) {
        map.set(o.operational_manager_id, o.operational_manager_name || "—");
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const sectorOptions = useMemo(() => {
    const set = new Set<string>(SECTORS);
    items.forEach((o) => { if (o.sector) set.add(o.sector); });
    return Array.from(set);
  }, [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-primary" />
            Ocorrências
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isOperational
              ? "Registre ocorrências das suas lojas para o time estratégico."
              : "Ocorrências abertas pelos gestores operacionais."}
          </p>
        </div>

        {isOperational && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Ocorrência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova Ocorrência</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>ID da loja *</Label>
                  <Input value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="Ex: 0751" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data</Label>
                    <Input type="date" value={occDate} onChange={(e) => setOccDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Horário</Label>
                    <Input type="time" value={occTime} onChange={(e) => setOccTime(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Ocorrência *</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o que aconteceu..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Setor *</Label>
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gestor (operacional)</Label>
                  <Input value={displayName || ""} readOnly className="bg-muted" />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={submitting}>
                  {submitting ? "Enviando..." : "Registrar Ocorrência"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-4">
        <div className={`grid gap-3 md:items-end ${canResolve ? "md:grid-cols-[2fr_1fr_1fr_1fr]" : "md:grid-cols-[2fr_1fr]"}`}>
          <div className="space-y-1.5">
            <Label>Buscar</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ID da loja, gestor ou texto da ocorrência"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="open">Abertas</SelectItem>
                <SelectItem value="resolved">Resolvidas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canResolve && (
            <>
              <div className="space-y-1.5">
                <Label>Setor</Label>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {sectorOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Gestor</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      <span className="truncate">
                        {creatorFilter.length === 0
                          ? "Todos"
                          : creatorFilter.length === 1
                          ? shortName(creatorOptions.find((c) => c.id === creatorFilter[0])?.name || "") || "—"
                          : `${creatorFilter.length} selecionados`}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 max-h-72 overflow-y-auto" align="start">
                    <div className="flex items-center justify-between px-2 py-1 mb-1">
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setCreatorFilter(creatorOptions.map((c) => c.id))}
                      >
                        Selecionar todos
                      </button>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:underline"
                        onClick={() => setCreatorFilter([])}
                      >
                        Limpar
                      </button>
                    </div>
                    {creatorOptions.map((c) => {
                      const checked = creatorFilter.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setCreatorFilter((prev) =>
                                v ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                              );
                            }}
                          />
                          <span className="truncate">{shortName(c.name) || "—"}</span>
                        </label>
                      );
                    })}
                    {creatorOptions.length === 0 && (
                      <div className="px-2 py-3 text-xs text-muted-foreground text-center">Nenhum gestor</div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhuma ocorrência encontrada.
          </Card>
        ) : (
          filtered.map((occ) => {
            const isOpen = occ.status === "open";
            const isExpanded = expanded.has(occ.id);
            return (
              <Card
                key={occ.id}
                className="p-4 space-y-3 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => toggleExpanded(occ.id)}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">
                      <Store className="h-3 w-3 mr-1" /> Loja {occ.store_id}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        isOpen
                          ? "bg-warning/20 text-warning border-warning/30"
                          : "bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                      }
                    >
                      {isOpen ? (
                        <><Clock className="h-3 w-3 mr-1" /> Aberta</>
                      ) : (
                        <><CheckCircle2 className="h-3 w-3 mr-1" /> Resolvida</>
                      )}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {occ.sector || "Operacional"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(() => {
                        try {
                          return format(new Date(occ.occurrence_date + "T00:00:00"), "dd/MM/yyyy");
                        } catch {
                          return occ.occurrence_date;
                        }
                      })()} às {occ.occurrence_time}
                    </span>
                    {!isOpen && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {shortName(occ.resolved_by_name) || "—"}
                        {occ.resolved_at && (
                          <span className="text-muted-foreground">
                            · {format(new Date(occ.resolved_at), "dd/MM/yyyy HH:mm")}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {canResolve && isOpen && (
                      <Button size="sm" onClick={() => { setResolveTarget(occ); setResolution(""); }}>
                        Responder
                      </Button>
                    )}
                    {canResolve && !isOpen && (
                      <Button size="sm" variant="outline" onClick={() => handleReopen(occ)}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reabrir
                      </Button>
                    )}
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(occ.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-foreground whitespace-pre-wrap">{occ.description}</p>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  Gestor: {shortName(occ.operational_manager_name) || "—"}
                </div>

                {!isOpen && isExpanded && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
                    <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resposta de {shortName(occ.resolved_by_name) || "—"}
                      {occ.resolved_at && (
                        <span className="text-muted-foreground font-normal">
                          · {format(new Date(occ.resolved_at), "dd/MM/yyyy HH:mm")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{occ.resolution}</p>
                  </div>
                )}
                {!isOpen && !isExpanded && (
                  <p className="text-[11px] text-primary">Clique para ver a resposta</p>
                )}
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={!!resolveTarget} onOpenChange={(open) => { if (!open) { setResolveTarget(null); setResolution(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Responder Ocorrência</DialogTitle>
          </DialogHeader>
          {resolveTarget && (
            <div className="space-y-4 mt-2">
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm space-y-1">
                <div className="text-xs text-muted-foreground">
                  Loja {resolveTarget.store_id} · {shortName(resolveTarget.operational_manager_name)}
                </div>
                <p className="whitespace-pre-wrap">{resolveTarget.description}</p>
              </div>
              <div>
                <Label>Resposta / Solução *</Label>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={5}
                  placeholder="Descreva a resposta ou o que foi feito..."
                />
              </div>
              <Button className="w-full" onClick={handleResolve} disabled={submitting}>
                {submitting ? "Salvando..." : "Marcar como Resolvida"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
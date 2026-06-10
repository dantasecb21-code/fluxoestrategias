import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useDbStrategies, StrategyType, STRATEGY_TYPE_LABELS } from "@/hooks/useDbStrategies";
import { DEFAULT_CATEGORIES, FIXED_CATEGORIES, StrategyCategory } from "@/types/strategy";
import { StrategyMetaForm } from "@/components/StrategyMetaForm";
import { CategoryCard } from "@/components/CategoryCard";
import { StrategyReport } from "@/components/StrategyReport";
import { FreeTextDistributor } from "@/components/FreeTextDistributor";
import { useCategoryEditor } from "@/hooks/useStrategies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { FileText, Plus, Save, Check, X, UserCheck, Loader2, Mail, ChevronDown, ChevronRight, CheckCircle2, ShieldCheck, History } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { StrategyMeta } from "@/types/strategy";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";

function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function initCategories(): StrategyCategory[] {
  return DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    id: generateId(),
    items: c.items.map((i) => ({ ...i, id: generateId(), checked: false })),
  }));
}

interface Manager {
  user_id: string;
  display_name: string;
  whatsapp?: string;
  avatar_url?: string;
  email?: string;
}

function calcProgress(categories: StrategyCategory[]) {
  const allItems = categories.flatMap((c) => c.items);
  if (allItems.length === 0) return { percent: 0, completed: 0, inProgress: 0, pending: 0, total: 0 };
  const completed = allItems.filter((i) => i.status === "completed").length;
  const inProgress = allItems.filter((i) => i.status === "in_progress").length;
  const pending = allItems.filter((i) => !i.status || i.status === "pending").length;
  const total = allItems.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { percent, completed, inProgress, pending, total };
}

const DRAFT_KEY = "strategy-draft";

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveDraft(data: { meta: StrategyMeta; categories: StrategyCategory[]; assignedTo: string; freeText: string }) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export default function StrategyBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { strategies, createStrategy, updateStrategy, loading } = useDbStrategies();
  const { role, user, displayName } = useAuth();
  const isStrategicAssistant = role === "strategic_assistant";
  const isAdmin = role === "admin";

  const existing = id ? strategies.find((s) => s.id === id) : null;

  // Pre-fill from query params (store request flow)
  const prefillStore = searchParams.get("store") || "";
  const prefillManager = searchParams.get("manager") || "";
  const prefillOperationalManager = searchParams.get("operational_manager") || "";
  const storeRequestId = searchParams.get("store_request_id") || "";
  const prefillPlatform = searchParams.get("platform") || "";
  const prefillType = searchParams.get("type") || "";
  const replacesStrategyId = searchParams.get("replaces") || "";
  const studyRequested = searchParams.get("study_requested") === "true";

  const [meta, setMeta] = useState<StrategyMeta>(() => {
    if (existing) {
      return { storeName: existing.store_name, managerName: existing.manager_name, operationalManager: existing.operational_manager, deadline: existing.deadline, plannedStartDate: existing.planned_start_date || "" };
    }
    // Query params take priority over draft
    if (prefillStore) {
      return { storeName: prefillStore, managerName: prefillManager, operationalManager: prefillOperationalManager, deadline: "", plannedStartDate: "" };
    }
    if (!id) {
      const draft = loadDraft();
      if (draft?.meta) return draft.meta;
    }
    return { storeName: "", managerName: "", operationalManager: "", deadline: "", plannedStartDate: "" };
  });
  const [categories, setCategories] = useState<StrategyCategory[]>(() => {
    if (existing?.categories?.length) return existing.categories;
    if (!id && !prefillStore) {
      const draft = loadDraft();
      if (draft?.categories?.length) return draft.categories;
    }
    return initCategories();
  });
  const [assignedTo, setAssignedTo] = useState<string>(() => {
    if (existing) return existing.assigned_to || "";
    if (!id && !prefillStore) {
      const draft = loadDraft();
      if (draft?.assignedTo) return draft.assignedTo;
    }
    return "";
  });
  const [strategyType, setStrategyType] = useState<StrategyType>(() => {
    if (existing) return (existing.strategy_type as StrategyType) || "initial";
    if (prefillType === "alignment" || prefillType === "retention") return prefillType as StrategyType;
    if (!id && !prefillStore) {
      const draft = loadDraft();
      if (draft?.strategyType) return draft.strategyType;
    }
    return "initial";
  });
  const [platform, setPlatform] = useState<string>(() => {
    if (existing) return existing.platform || "99food";
    if (prefillPlatform) return prefillPlatform;
    if (!id && !prefillStore) {
      const draft = loadDraft();
      if (draft?.platform) return draft.platform;
    }
    return "99food";
  });
  const [observation, setObservation] = useState<string>(() => {
    if (existing) return existing.observation || "";
    if (!id && !prefillStore) {
      const draft = loadDraft();
      if (draft?.observation) return draft.observation;
    }
    return "";
  });
  const [showReport, setShowReport] = useState(false);
  const [showDetailedProgress, setShowDetailedProgress] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [newDeadline, setNewDeadline] = useState("");
  const [showAdminReturnDialog, setShowAdminReturnDialog] = useState(false);
  const [adminReturnReason, setAdminReturnReason] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savedId, setSavedId] = useState<string | null>(id || null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [saving, setSaving] = useState(false);
  const [strategists, setStrategists] = useState<Manager[]>([]);
  const [strategicOwnerId, setStrategicOwnerId] = useState<string>(existing?.user_id || "");

  const [storeAccess, setStoreAccess] = useState(existing?.store_access_confirmed || false);


  // History
  const [history, setHistory] = useState<{ id: string; user_name: string; action: string; field_changed: string; old_value: string; new_value: string; created_at: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const editor = useCategoryEditor(categories, setCategories);
  const strategyStatus = existing?.status || "in_progress";

  useEffect(() => {
    if (!id) return;
    supabase
      .from("strategy_history")
      .select("*")
      .eq("strategy_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setHistory(data as any); });
  }, [id, strategyStatus]);

  // Autosave draft while creating a new strategy (sobrevive a troca de abas)
  useEffect(() => {
    if (id) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          meta, categories, assignedTo, strategyType, platform, observation,
        }));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [id, meta, categories, assignedTo, strategyType, platform, observation]);

  useEffect(() => {
    if (existing) {
      setMeta({
        storeName: existing.store_name,
        managerName: existing.manager_name,
        operationalManager: existing.operational_manager,
        deadline: existing.deadline,
        plannedStartDate: existing.planned_start_date || "",
      });
      setCategories(existing.categories);
      setAssignedTo(existing.assigned_to || "");
      setStrategyType((existing.strategy_type as StrategyType) || "initial");
      setPlatform(existing.platform || "99food");
      setObservation(existing.observation || "");
      setSavedId(existing.id);
      setStrategicOwnerId(existing.user_id);
    }
  }, [existing?.id]);

  const [allOperationalManagers, setAllOperationalManagers] = useState<(Manager & { platforms?: string[] })[]>([]);

  useEffect(() => {
    async function fetchManagers() {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "operational");
      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, whatsapp, avatar_url, email, platforms")
          .in("user_id", roles.map((r) => r.user_id))
          .eq("approved", true);
        if (profiles) setAllOperationalManagers(profiles as any[]);
      }
    }
    fetchManagers();
  }, []);

  // Load strategic users (admin can reassign the strategic owner)
  useEffect(() => {
    if (!isAdmin) return;
    async function fetchStrategists() {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "strategic");
      if (!roles || roles.length === 0) return;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, email")
        .in("user_id", roles.map((r) => r.user_id))
        .eq("approved", true);
      if (profiles) setStrategists(profiles as any[]);
    }
    fetchStrategists();
  }, [isAdmin]);

  // Filter managers by selected platform
  useEffect(() => {
    const filtered = allOperationalManagers.filter((m) => {
      if (!m.platforms || m.platforms.length === 0) return true; // show if no platform set
      return m.platforms.includes(platform);
    });
    setManagers(filtered);
    // Clear selection if current assignee doesn't match
    if (assignedTo && !filtered.some((m) => m.user_id === assignedTo)) {
      setAssignedTo("");
      setMeta((prev) => ({ ...prev, operationalManager: "" }));
    }
  }, [platform, allOperationalManagers]);

  const handleManagerSelect = (userId: string) => {
    setAssignedTo(userId);
    if (userId && userId !== "none") {
      const found = managers.find((m) => m.user_id === userId);
      if (found) {
        setMeta((prev) => ({ ...prev, operationalManager: found.display_name }));
      }
    } else {
      setMeta((prev) => ({ ...prev, operationalManager: "" }));
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const logAttempt = async (outcome: string, reason = "", extra: Record<string, unknown> = {}) => {
      try {
        if (!user) return;
        await supabase.from("strategy_save_attempts").insert({
          user_id: user.id,
          user_name: displayName || user.email || "",
          strategy_id: savedId || null,
          store_name: meta.storeName || "",
          operational_manager: assignedTo || "",
          is_new: !savedId,
          outcome,
          reason,
          payload: {
            strategy_type: strategyType,
            platform,
            deadline: meta.deadline,
            planned_start_date: meta.plannedStartDate,
            categories_count: categories.length,
            items_count: categories.reduce((acc, c) => acc + c.items.length, 0),
            ...extra,
          },
        } as any);
      } catch (e) {
        console.warn("logAttempt failed", e);
      }
    };

    if (!meta.storeName.trim()) {
      toast.error("Preencha o nome da loja!");
      logAttempt("validation_failed", "missing_store_name");
      return;
    }
    if (!window.confirm("Deseja salvar as alterações?")) {
      logAttempt("cancelled", "user_cancelled_confirm");
      return;
    }
    if (!assignedTo || assignedTo === "none") {
      toast.error("Selecione um Gestor Operacional!");
      logAttempt("validation_failed", "missing_operational_manager");
      return;
    }
    setSaving(true);
    try {
    if (savedId) {
      await updateStrategy(savedId, {
        store_name: meta.storeName,
        manager_name: meta.managerName,
        operational_manager: meta.operationalManager,
        deadline: meta.deadline,
        planned_start_date: meta.plannedStartDate,
        categories,
        assigned_to: assignedTo || null,
        store_access_confirmed: storeAccess,
        strategy_type: strategyType,
        observation,
        platform,
        ...(isAdmin && strategicOwnerId && existing && strategicOwnerId !== existing.user_id ? { user_id: strategicOwnerId } : {}),
      });
      clearDraft();
      toast.success("Estratégia atualizada!");
      logAttempt("success", "updated");
    } else {
      const created = await createStrategy({
        store_name: meta.storeName,
        manager_name: meta.managerName,
        operational_manager: meta.operationalManager,
        deadline: meta.deadline,
        planned_start_date: meta.plannedStartDate,
        categories,
        assigned_to: assignedTo || null,
        strategy_type: strategyType,
        observation,
        platform,
        store_request_id: storeRequestId || undefined,
        study_requested: studyRequested || undefined,
        // Só 99Food precisa de validação do admin. iFood/Keeta vão direto pro gestor.
        // Admin sempre cria já validada.
        status: isAdmin || platform !== "99food" ? "in_progress" : "pending_admin_approval",
        admin_approved: isAdmin || platform !== "99food" ? true : false,
      });
      if (created) {
        setSavedId(created.id);
        clearDraft();
        // If this is a realignment replacing a returned strategy, archive the original
        // and persist the lineage link.
        if (replacesStrategyId) {
          try {
            await supabase
              .from("strategies")
              .update({ replaces_strategy_id: replacesStrategyId } as any)
              .eq("id", created.id);
            await supabase
              .from("strategies")
              .update({ deleted_at: new Date().toISOString() } as any)
              .eq("id", replacesStrategyId);
          } catch (e) {
            console.warn("Failed to archive replaced strategy", e);
          }
        }
        // Auto-complete store request if coming from store request flow
        if (storeRequestId) {
          const storeRequestUpdate: Record<string, string> = {
            status: "completed",
            store_creation_status: "created",
          };

          const { data: storeRequest, error: storeRequestFetchError } = await supabase
            .from("store_requests")
            .select("store_created_at")
            .eq("id", storeRequestId)
            .maybeSingle();

          if (!storeRequestFetchError && !storeRequest?.store_created_at) {
            storeRequestUpdate.store_created_at = new Date().toISOString();
          }

          const { error: srError } = await supabase
            .from("store_requests")
            .update(storeRequestUpdate as any)
            .eq("id", storeRequestId);

          if (srError) {
            console.error("Failed to update store request:", srError);
          }
        }
        toast.success("Estratégia criada!");
        logAttempt("success", "created", { created_id: created.id });
        navigate(`/estrategia/${created.id}`, { replace: true });
      } else {
        logAttempt("error", "create_returned_null");
        toast.error("Falha ao criar estratégia. Tenta de novo!");
      }
    }
    } catch (err: any) {
      console.error("handleSave error", err);
      logAttempt("error", err?.message || "exception_thrown");
      toast.error("Erro ao salvar. Tenta de novo!");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = () => {
    if (newCatName.trim()) {
      editor.addCategory(newCatName.trim());
      setNewCatName("");
      setAddingCategory(false);
    }
  };



  const selectedManager = managers.find((m) => m.user_id === assignedTo);
  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);
  const progress = calcProgress(categories);

  const handleApprove = async () => {
    if (!savedId) return;
    await updateStrategy(savedId, { status: "approved" });
    toast.success("Estratégia aprovada!");
  };

  const handleReject = async () => {
    if (!savedId || !newDeadline) {
      toast.error("Defina o novo prazo antes de devolver!");
      return;
    }
    // Importante: NÃO enviar categories aqui. Devolver é só mudança de status/prazo.
    // Se mandar categories do estado local, podemos sobrescrever o conteúdo que o gestor salvou
    // (ex: se o estado ainda estiver no template inicial enquanto strategies carrega).
    await updateStrategy(savedId, { status: "in_progress", deadline: newDeadline, returned: true });
    setShowRejectDialog(false);
    setNewDeadline("");
    toast.success("Estratégia devolvida com novo prazo.");
  };

  const handleRevokeApproval = async () => {
    if (!savedId) return;
    await updateStrategy(savedId, { status: "pending_approval" });
    toast.success("Aprovação removida. Estratégia voltou para análise.");
  };

  // Estrategista encaminha a estratégia pro administrador validar antes de ir pro gestor
  const handleSendToAdmin = async () => {
    if (!savedId) return;
    if (!assignedTo || assignedTo === "none") {
      toast.error("Selecione um Gestor Operacional antes de encaminhar!");
      return;
    }
    if (!window.confirm("Encaminhar para o administrador validar?")) return;
    await updateStrategy(savedId, { status: "pending_admin_approval", returned: false, admin_return_reason: "" } as any);
    toast.success("Encaminhada ao administrador.");
  };

  // Admin aprova a validação inicial → libera para o gestor operacional
  const handleAdminApprove = async () => {
    if (!savedId) return;
    await updateStrategy(savedId, { status: "in_progress", admin_approved: true, returned: false });
    toast.success("Aprovada e liberada para o gestor.");
  };

  // Admin devolve para o estrategista revisar
  const handleAdminReturn = async () => {
    if (!savedId) return;
    if (!adminReturnReason.trim()) {
      toast.error("Escreve o motivo da devolução.");
      return;
    }
    await updateStrategy(savedId, {
      status: "in_progress",
      returned: true,
      admin_return_reason: adminReturnReason.trim(),
    } as any);
    toast.success("Devolvida ao estrategista com o motivo.");
    setShowAdminReturnDialog(false);
    setAdminReturnReason("");
  };

  const STATUS_BADGE_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    in_progress: { label: "Em andamento", variant: "secondary" },
    pending_admin_approval: { label: "Aguardando admin", variant: "outline" },
    pending_approval: { label: "Aguardando aprovação", variant: "outline" },
    approved: { label: "Aprovada ✓", variant: "default" },
  };

  if (loading && id) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-xl text-foreground">
              {id ? `${STRATEGY_TYPE_LABELS[strategyType] || "Estratégia"} - ${meta.storeName || ""}` : "Nova Estratégia"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {totalItems} itens na estratégia
              </p>
              {id && existing && (
                <Badge variant={STATUS_BADGE_MAP[strategyStatus]?.variant || "secondary"} className="text-[10px] py-0 px-1.5 h-4 leading-none">
                  {STATUS_BADGE_MAP[strategyStatus]?.label || "Em andamento"}
                </Badge>
              )}
              {id && existing?.admin_approved && (() => {
                const approval = history.find(
                  (h) => h.action === "status_change" && h.old_value === "pending_admin_approval" && h.new_value === "in_progress"
                );
                if (!approval) return null;
                return (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className="text-[10px] py-0 px-1.5 h-4 leading-none bg-destructive text-destructive-foreground border-destructive cursor-help">
                          Validada por {approval.user_name?.split(" ")[0] || "admin"}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="bg-destructive text-destructive-foreground border-destructive">
                        <p className="text-xs">Aprovada por {approval.user_name || "admin"} em {formatDateBR(approval.created_at)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })()}
            </div>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
        {id && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowDetailedProgress(!showDetailedProgress); setShowReport(false); }}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> {showDetailedProgress ? "Editor" : "Progresso"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowReport(!showReport); setShowDetailedProgress(false); }}>
              <FileText className="h-4 w-4 mr-1" /> {showReport ? "Editor" : "Relatório"}
            </Button>
          </div>
        )}
      </div>

      {/* Progress bar for existing strategies */}
      {id && progress.total > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-medium">Progresso da Execução</span>
            <span className="font-heading font-bold text-lg text-primary">{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} className="h-2 mb-2" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="text-success">{progress.completed} concluídos</span>
            <span className="text-info">{progress.inProgress} em andamento</span>
            <span className="text-warning">{progress.pending} pendentes</span>
          </div>
          {existing && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
              <span>📅 Início previsto: <strong className="text-foreground">{existing.planned_start_date ? formatDateBR(existing.planned_start_date) : "—"}</strong></span>
              <span>🚀 Início real: <strong className="text-foreground">{existing.started_at ? formatDateBR(existing.started_at) : "ainda não iniciada"}</strong></span>
              <span>⏰ Prazo final: <strong className="text-foreground">{existing.deadline ? formatDateBR(existing.deadline) : "—"}</strong></span>
            </div>
          )}
        </Card>
      )}

      {/* Store access + approval for pending_approval */}
      {id && existing && strategyStatus === "pending_approval" && (
        <Card className="p-4 border-warning/50 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-foreground font-medium">Acesso à loja confirmado pelo gestor:</span>
            <span className={existing.store_access_confirmed ? "text-success" : "text-warning"}>
              {existing.store_access_confirmed ? "Sim ✓" : "Não ✗"}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleApprove} className="bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowRejectDialog(true)}>
              Devolver com Novo Prazo
            </Button>
          </div>
          {showRejectDialog && (
            <div className="flex items-end gap-2 pt-2 border-t border-border">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Novo prazo</label>
                <Input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="bg-background" />
              </div>
              <Button size="sm" variant="outline" onClick={handleReject} disabled={!newDeadline}>
                Confirmar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRejectDialog(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </Card>
      )}

      {id && existing && strategyStatus === "approved" && (
        <Card className="p-4 border-success/50 bg-success/10 space-y-2">
          <p className="text-sm text-success font-medium text-center">✅ Estratégia aprovada</p>
          <div className="flex justify-center">
            <Button size="sm" variant="outline" onClick={handleRevokeApproval} className="text-xs">
              Remover aprovação
            </Button>
          </div>
        </Card>
      )}

      {/* Aguardando admin: visão do administrador para aprovar/devolver */}
      {id && existing && strategyStatus === "pending_admin_approval" && isAdmin && (
        <Card className="p-4 border-purple-500/40 bg-purple-500/5 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <span className="text-foreground font-medium">
              Estratégia aguardando sua validação antes de ir pro gestor.
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleAdminApprove} className="bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar e enviar ao gestor
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdminReturnDialog(true)}>
              Devolver ao estrategista
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={showAdminReturnDialog} onOpenChange={(o) => { setShowAdminReturnDialog(o); if (!o) setAdminReturnReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver ao estrategista</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Motivo da devolução</label>
            <Textarea
              value={adminReturnReason}
              onChange={(e) => setAdminReturnReason(e.target.value)}
              placeholder="Escreva o motivo pra mandar pro estrategista..."
              rows={4}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowAdminReturnDialog(false); setAdminReturnReason(""); }}>Cancelar</Button>
            <Button onClick={handleAdminReturn} disabled={!adminReturnReason.trim()}>Confirmar devolução</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aguardando admin: visão do estrategista (somente leitura do status) */}
      {id && existing && strategyStatus === "pending_admin_approval" && !isAdmin && (
        <Card className="p-4 border-purple-500/40 bg-purple-500/5">
          <p className="text-sm text-foreground text-center">
            ⏳ Aguardando validação do administrador antes de ir pro gestor.
          </p>
        </Card>
      )}

      {/* Estratégia devolvida pelo admin: alerta com motivo (estrategista) */}
      {id && existing && (existing as any).returned && (existing as any).admin_return_reason && !isAdmin && (
        <Card className="p-4 border-destructive/40 bg-destructive/10 space-y-1">
          <p className="text-sm font-medium text-destructive">⚠️ Devolvida pelo administrador</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{(existing as any).admin_return_reason}</p>
        </Card>
      )}

      {/* Botão "Encaminhar pro admin" — estrategista, antes da primeira aprovação (só 99Food) */}
      {id && existing && !isStrategicAssistant && !existing.admin_approved && strategyStatus === "in_progress" && existing.platform === "99food" && (
        <Card className="p-4 border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="text-foreground font-medium">
              Pronta para enviar? Toda estratégia nova passa pelo administrador antes de ir pro gestor.
            </span>
          </div>
          <Button size="sm" onClick={handleSendToAdmin} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <ShieldCheck className="h-3 w-3 mr-1" /> Encaminhar para o administrador
          </Button>
        </Card>
      )}

      {/* Detailed progress view */}
      {showDetailedProgress && id ? (
        <div className="space-y-4">
          <Card className="p-3 flex flex-wrap gap-2">
            {([
              { key: "all", label: `Todos (${progress.total})`, cls: "" },
              { key: "pending", label: `Pendentes (${progress.pending})`, cls: "border-warning/40 text-warning" },
              { key: "in_progress", label: `Em andamento (${progress.inProgress})`, cls: "border-info/40 text-info" },
              { key: "completed", label: `Concluídos (${progress.completed})`, cls: "border-success/40 text-success" },
            ] as const).map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={statusFilter === f.key ? "default" : "outline"}
                className={statusFilter === f.key ? "" : f.cls}
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </Card>
          {categories.map((cat) => {
            const filteredItems = cat.items.filter((i) => {
              if (statusFilter === "all") return true;
              const st = i.status || "pending";
              return st === statusFilter;
            });
            if (filteredItems.length === 0) return null;
            const isExpanded = expandedCats[cat.id] !== false;
            const catCompleted = cat.items.filter((i) => i.status === "completed").length;
            return (
              <Card key={cat.id} className="overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedCats((prev) => ({ ...prev, [cat.id]: !isExpanded }))}
                >
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    {cat.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {statusFilter === "all"
                      ? `${catCompleted}/${cat.items.length} concluídos`
                      : `${filteredItems.length} item(s)`}
                  </span>
                </button>
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {filteredItems.map((item) => {
                      const st = item.status || "pending";
                      return (
                        <div key={item.id} className="p-4 flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm text-foreground leading-relaxed">{item.text}</p>
                            {item.observation && (
                              <p className="text-xs text-muted-foreground mt-1 italic">💬 {item.observation}</p>
                            )}
                          </div>
                          <Select
                            value={st}
                            onValueChange={(v) => {
                              setCategories((prev) =>
                                prev.map((c) =>
                                  c.id === cat.id
                                    ? {
                                        ...c,
                                        items: c.items.map((i) => {
                                          if (i.id !== item.id) return i;
                                          // Se o estrategista tentar voltar para pendente quando o gestor já mexeu,
                                          // ele pode. O problema relatado era na visão do filtro ou lógica de bloqueio.
                                          return { ...i, status: v as any };
                                        }),
                                      }
                                    : c
                                )
                              );
                            }}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-warning" />
                                    <span>Pendente</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="in_progress">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-info" />
                                    <span>Em andamento</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="completed">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-success" />
                                    <span>Concluído</span>
                                  </div>
                                </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : showReport ? (
        <StrategyReport
          storeName={meta.storeName}
          managerName={meta.managerName}
          operationalManager={meta.operationalManager}
          deadline={meta.deadline}
          categories={categories}
          strategyType={strategyType}
          observation={observation}
        />
      ) : (
        <>
          <StrategyMetaForm
            meta={meta}
            onChange={setMeta}
            strategyType={strategyType}
            onTypeChange={setStrategyType}
            platform={platform as any}
            onPlatformChange={setPlatform as any}
            strategists={isAdmin && existing ? strategists : undefined}
            strategicOwnerId={strategicOwnerId}
            onStrategicOwnerChange={setStrategicOwnerId}
            originalStrategicOwnerId={existing?.user_id}
          />

          {/* Assign to operational manager */}
          <Card className="p-4 border-border bg-card space-y-2">
            <Label className="text-muted-foreground text-xs flex items-center gap-1">
              <UserCheck className="h-3 w-3" /> Gestor Operacional (obrigatório)
            </Label>
            {managers.length > 0 ? (
              <>
                <Select value={assignedTo} onValueChange={handleManagerSelect}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione o gestor operacional..." />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-muted-foreground">{m.display_name?.charAt(0)?.toUpperCase()}</span>
                            )}
                          </div>
                          <span>{m.display_name || "Sem nome"}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedManager && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="text-foreground font-medium">E-mail:</span>
                      <span className="text-muted-foreground">{selectedManager.email || "Não informado"}</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Checkbox
                        id="store-access-admin"
                        checked={storeAccess}
                        onCheckedChange={(v) => setStoreAccess(!!v)}
                      />
                      <label htmlFor="store-access-admin" className="text-xs text-foreground font-medium cursor-pointer flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-primary" />
                        Gestor tem acesso à loja na plataforma
                      </label>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum gestor operacional cadastrado.
              </p>
            )}
          </Card>

          {/* Observação para o gestor */}
          <Card className="p-4 border-warning/30 bg-warning/5 space-y-2">
            <Label className="text-foreground font-heading font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-warning" /> Observação para o gestor
            </Label>
            <p className="text-xs text-muted-foreground">
              Informação importante que ficará em destaque para o gestor operacional.
            </p>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: loja tem dificuldade com entrega, dono viaja muito, equipe nova..."
              className="bg-background min-h-[80px]"
            />
          </Card>



          {/* Caixa de texto livre */}
          <FreeTextDistributor categories={categories} onAddItem={editor.addItem} />

          <div className="space-y-4">
            {categories.map((cat) => {
              const isFixed = FIXED_CATEGORIES.some((fc) => fc.name === cat.name);
              return (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  allCategories={categories}
                  isFixed={isFixed}
                  onEditCategory={editor.editCategory}
                  onRemoveCategory={editor.removeCategory}
                  onAddItem={editor.addItem}
                  onEditItem={editor.editItem}
                  onRemoveItem={editor.removeItem}
                  onMoveItem={editor.moveItem}
                  onMoveItemToCategory={editor.moveItemToCategory}
                />
              );
            })}
          </div>

          {addingCategory ? (
            <div className="flex items-center gap-2 p-4 border border-dashed border-primary/40 rounded-lg">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nome da nova categoria"
                className="bg-background"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              />
              <Button size="sm" onClick={handleAddCategory} disabled={!newCatName.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Check className="h-4 w-4 mr-1" /> Criar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingCategory(false); setNewCatName(""); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setAddingCategory(true)}
              className="w-full border-dashed border-primary/30 text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 mr-2" /> Nova categoria
            </Button>
          )}

        </>
      )}
      {/* Histórico de alterações */}
      {id && history.length > 0 && (
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" /> Histórico de Alterações ({history.length})
              </span>
              {showHistory ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="p-4 mt-2 space-y-3">
              {history.map((h) => {
                const date = new Date(h.created_at);
                const STATUS_LABELS: Record<string, string> = {
                  in_progress: "Em andamento",
                  pending_approval: "Aguardando aprovação",
                  approved: "Aprovada",
                };
                return (
                  <div key={h.id} className="flex items-start gap-3 text-sm border-b border-border pb-2 last:border-0">
                    <div className="flex-1">
                      <p className="text-foreground font-medium">{h.user_name}</p>
                      <p className="text-muted-foreground text-xs">
                        {STATUS_LABELS[h.old_value] || h.old_value} → <Badge variant="outline" className="text-[10px] py-0 px-1">{STATUS_LABELS[h.new_value] || h.new_value}</Badge>
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {date.toLocaleDateString("pt-BR")} {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}


    </div>
  );
}

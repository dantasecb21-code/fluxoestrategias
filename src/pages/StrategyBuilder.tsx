import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { DEFAULT_CATEGORIES, StrategyCategory } from "@/types/strategy";
import { StrategyMetaForm } from "@/components/StrategyMetaForm";
import { CategoryCard } from "@/components/CategoryCard";
import { StrategyReport } from "@/components/StrategyReport";
import { useCategoryEditor } from "@/hooks/useStrategies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { FileText, Plus, Save, Check, X, UserCheck, Sparkles, Loader2, ImagePlus, Mail, ChevronDown, ChevronRight, CheckCircle2, ShieldCheck } from "lucide-react";
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
  const { strategies, createStrategy, updateStrategy, loading } = useDbStrategies();
  const { role } = useAuth();

  const existing = id ? strategies.find((s) => s.id === id) : null;
  const draft = !id ? loadDraft() : null;

  const [meta, setMeta] = useState<StrategyMeta>(
    existing
      ? { storeName: existing.store_name, managerName: existing.manager_name, operationalManager: existing.operational_manager, deadline: existing.deadline }
      : draft?.meta || { storeName: "", managerName: "", operationalManager: "", deadline: "" }
  );
  const [categories, setCategories] = useState<StrategyCategory[]>(
    existing?.categories?.length ? existing.categories : draft?.categories?.length ? draft.categories : initCategories()
  );
  const [assignedTo, setAssignedTo] = useState<string>(existing?.assigned_to || draft?.assignedTo || "");
  const [showReport, setShowReport] = useState(false);
  const [showDetailedProgress, setShowDetailedProgress] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [newDeadline, setNewDeadline] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savedId, setSavedId] = useState<string | null>(id || null);
  const [managers, setManagers] = useState<Manager[]>([]);

  // Free-text AI
  const [freeText, setFreeText] = useState(draft?.freeText || "");
  const [organizingAI, setOrganizingAI] = useState(false);

  // Image upload
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [storeAccess, setStoreAccess] = useState(existing?.store_access_confirmed || false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useCategoryEditor(categories, setCategories);
  const strategyStatus = existing?.status || "in_progress";

  // Save draft to localStorage for new strategies
  useEffect(() => {
    if (!id) {
      saveDraft({ meta, categories, assignedTo, freeText });
    }
  }, [meta, categories, assignedTo, freeText, id]);

  useEffect(() => {
    if (existing) {
      setMeta({
        storeName: existing.store_name,
        managerName: existing.manager_name,
        operationalManager: existing.operational_manager,
        deadline: existing.deadline,
      });
      setCategories(existing.categories);
      setAssignedTo(existing.assigned_to || "");
      setSavedId(existing.id);
    }
  }, [existing?.id]);

  useEffect(() => {
    async function fetchManagers() {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "operational");
      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, whatsapp, avatar_url, email")
          .in("user_id", roles.map((r) => r.user_id))
          .eq("approved", true);
        if (profiles) setManagers(profiles as Manager[]);
      }
    }
    fetchManagers();
  }, []);

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
    if (!meta.storeName.trim()) {
      toast.error("Preencha o nome da loja!");
      return;
    }
    if (!assignedTo || assignedTo === "none") {
      toast.error("Selecione um Gestor Operacional!");
      return;
    }
    if (savedId) {
      await updateStrategy(savedId, {
        store_name: meta.storeName,
        manager_name: meta.managerName,
        operational_manager: meta.operationalManager,
        deadline: meta.deadline,
        categories,
        assigned_to: assignedTo || null,
        store_access_confirmed: storeAccess,
      });
      clearDraft();
      toast.success("Estratégia atualizada!");
    } else {
      const created = await createStrategy({
        store_name: meta.storeName,
        manager_name: meta.managerName,
        operational_manager: meta.operationalManager,
        deadline: meta.deadline,
        categories,
        assigned_to: assignedTo || null,
      });
      if (created) {
        setSavedId(created.id);
        clearDraft();
        toast.success("Estratégia criada!");
        navigate(`/estrategia/${created.id}`, { replace: true });
      }
    }
  };

  const handleAddCategory = () => {
    if (newCatName.trim()) {
      editor.addCategory(newCatName.trim());
      setNewCatName("");
      setAddingCategory(false);
    }
  };

  // Image upload handler
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        setUploadedImage(base64);
        setUploadingImage(false);
        toast.success("Imagem carregada! Clique em 'Organizar com IA' para analisar.");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erro ao carregar imagem.");
      setUploadingImage(false);
    }
  };

  // Free-text AI: organize into categories
  const handleOrganizeWithAI = async () => {
    if (!freeText.trim() && !uploadedImage) {
      toast.error("Escreva algo ou envie uma imagem primeiro!");
      return;
    }
    setOrganizingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("organize-strategy", {
        body: { freeText: freeText.trim(), storeName: meta.storeName, imageBase64: uploadedImage || undefined },
      });
      if (error) throw error;
      if (data?.categories && Array.isArray(data.categories)) {
        const newCats: StrategyCategory[] = data.categories.map((cat: any) => ({
          id: generateId(),
          name: cat.name,
          items: (cat.items || []).map((item: any) => ({
            id: generateId(),
            name: item.name || "",
            text: item.text || "",
            checked: false,
            status: "pending" as const,
          })),
        }));
        setCategories((prev) => [...prev, ...newCats]);

        // Save context for AI learning
        if (freeText.trim()) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("ai_context_entries" as any).insert({
              user_id: user.id,
              content: freeText.trim(),
              structured_summary: JSON.stringify(data.categories.map((c: any) => c.name)),
              category: meta.storeName || "geral",
            });
          }
        }

        setFreeText("");
        setUploadedImage(null);
        toast.success(`${newCats.length} categorias adicionadas pela IA!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao organizar com IA. Tente novamente.");
    } finally {
      setOrganizingAI(false);
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
    await updateStrategy(savedId, { status: "in_progress", deadline: newDeadline });
    setShowRejectDialog(false);
    setNewDeadline("");
    toast.success("Estratégia devolvida com novo prazo.");
  };

  const handleRevokeApproval = async () => {
    if (!savedId) return;
    await updateStrategy(savedId, { status: "pending_approval" });
    toast.success("Aprovação removida. Estratégia voltou para análise.");
  };

  const STATUS_BADGE_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    in_progress: { label: "Em andamento", variant: "secondary" },
    pending_approval: { label: "Aguardando aprovação", variant: "outline" },
    approved: { label: "Aprovada ✓", variant: "default" },
  };

  if (loading && id) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-xl text-foreground">
              {id ? `Estratégia Inicial - ${meta.storeName || ""}` : "Nova Estratégia"}
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
            </div>
          </div>
          <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
            <Save className="h-4 w-4 mr-1" /> Salvar
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
            <span className="text-primary">{progress.inProgress} em andamento</span>
            <span className="text-warning">{progress.pending} pendentes</span>
          </div>
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

      {/* Detailed progress view */}
      {showDetailedProgress && id ? (
        <div className="space-y-4">
          {categories.filter((c) => c.items.length > 0).map((cat) => {
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
                  <span className="text-xs text-muted-foreground">{catCompleted}/{cat.items.length} concluídos</span>
                </button>
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {cat.items.map((item) => {
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
                                    ? { ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, status: v as any } : i)) }
                                    : c
                                )
                              );
                            }}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending"><span className="text-warning">● </span>Pendente</SelectItem>
                              <SelectItem value="in_progress"><span className="text-primary">● </span>Em andamento</SelectItem>
                              <SelectItem value="completed"><span className="text-success">● </span>Concluído</SelectItem>
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
        />
      ) : (
        <>
          <StrategyMetaForm meta={meta} onChange={setMeta} />

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

          {/* Free-text AI box */}
          <Card className="p-4 border-border bg-card space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label className="text-foreground font-heading font-semibold text-sm">Escreva livremente</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Escreva o que precisa ser feito na loja ou envie um print. A IA vai organizar tudo em categorias com passo a passo detalhado.
            </p>
            <Textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of Array.from(items)) {
                  if (item.type.startsWith("image/")) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) handleImageUpload(file);
                    return;
                  }
                }
              }}
              placeholder="Ex: a loja precisa trocar a foto de capa, criar um cupom novo... (ou cole um print com Ctrl+V)"
              rows={4}
              className="bg-background"
            />
            {uploadedImage && (
              <div className="relative inline-block">
                <img src={`data:image/png;base64,${uploadedImage}`} alt="Preview" className="h-20 rounded-lg border border-border" />
                <button
                  onClick={() => setUploadedImage(null)}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <Button
                size="sm"
                onClick={handleOrganizeWithAI}
                disabled={organizingAI || (!freeText.trim() && !uploadedImage)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {organizingAI ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                {organizingAI ? "Organizando..." : "Organizar com IA"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4 mr-1" />
                )}
                Enviar Print
              </Button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f);
                  e.target.value = "";
                }}
              />
            </div>
          </Card>

          <div className="space-y-4">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                allCategories={categories}
                onEditCategory={editor.editCategory}
                onRemoveCategory={editor.removeCategory}
                onAddItem={editor.addItem}
                onEditItem={editor.editItem}
                onRemoveItem={editor.removeItem}
                onMoveItem={editor.moveItem}
                onMoveItemToCategory={editor.moveItemToCategory}
              />
            ))}
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
    </div>
  );
}

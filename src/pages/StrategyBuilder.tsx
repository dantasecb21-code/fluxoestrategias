import { useState, useEffect } from "react";
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
import { FileText, Plus, Save, Check, X, UserCheck, Sparkles, Loader2, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { StrategyMeta } from "@/types/strategy";
import { supabase } from "@/integrations/supabase/client";

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

export default function StrategyBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { strategies, createStrategy, updateStrategy, loading } = useDbStrategies();

  const existing = id ? strategies.find((s) => s.id === id) : null;

  const [meta, setMeta] = useState<StrategyMeta>(
    existing
      ? { storeName: existing.store_name, managerName: existing.manager_name, operationalManager: existing.operational_manager, deadline: existing.deadline }
      : { storeName: "", managerName: "", operationalManager: "", deadline: "" }
  );
  const [categories, setCategories] = useState<StrategyCategory[]>(
    existing?.categories?.length ? existing.categories : initCategories()
  );
  const [assignedTo, setAssignedTo] = useState<string>(existing?.assigned_to || "");
  const [showReport, setShowReport] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savedId, setSavedId] = useState<string | null>(id || null);
  const [managers, setManagers] = useState<Manager[]>([]);

  // Free-text AI
  const [freeText, setFreeText] = useState("");
  const [organizingAI, setOrganizingAI] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const editor = useCategoryEditor(categories, setCategories);

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
          .select("user_id, display_name, whatsapp")
          .in("user_id", roles.map((r) => r.user_id))
          .eq("approved", true);
        if (profiles) setManagers(profiles);
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
      });
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

  // Free-text AI: organize into categories
  const handleOrganizeWithAI = async () => {
    if (!freeText.trim()) {
      toast.error("Escreva algo primeiro!");
      return;
    }
    setOrganizingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("organize-strategy", {
        body: { freeText: freeText.trim(), storeName: meta.storeName },
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
        setFreeText("");
        toast.success(`${newCats.length} categorias adicionadas pela IA!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao organizar com IA. Tente novamente.");
    } finally {
      setOrganizingAI(false);
    }
  };

  // Speech recognition
  const toggleRecording = () => {
    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta gravação de áudio.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setFreeText((prev) => {
        const base = prev.endsWith(" ") ? prev : prev ? prev + " " : "";
        return base + transcript;
      });
    };

    rec.onerror = () => {
      setIsRecording(false);
      toast.error("Erro na gravação.");
    };

    rec.onend = () => setIsRecording(false);

    rec.start();
    setRecognition(rec);
    setIsRecording(true);
    toast.info("Gravando... fale agora!");
  };

  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);
  const progress = calcProgress(categories);

  if (loading && id) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-foreground">
            {id ? meta.storeName || "Editar Estratégia" : "Nova Estratégia"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {totalItems} itens na estratégia
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowReport(!showReport)}>
            <FileText className="h-4 w-4 mr-1" /> {showReport ? "Editor" : "Relatório"}
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        </div>
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

      {showReport ? (
        <StrategyReport
          storeName={meta.storeName}
          managerName={meta.managerName}
          operationalManager={meta.operationalManager}
          deadline={meta.deadline}
          categories={categories}
          whatsapp={managers.find((m) => m.user_id === assignedTo)?.whatsapp}
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
              <Select value={assignedTo} onValueChange={handleManagerSelect}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione o gestor operacional..." />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              Escreva ou fale o que precisa ser feito na loja. A IA vai organizar tudo em categorias automaticamente.
            </p>
            <Textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Ex: a loja precisa trocar a foto de capa, criar um cupom novo, responder as avaliações negativas, colocar foto nos produtos..."
              rows={4}
              className="bg-background"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleOrganizeWithAI}
                disabled={organizingAI || !freeText.trim()}
              >
                {organizingAI ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                {organizingAI ? "Organizando..." : "Organizar com IA"}
              </Button>
              <Button
                size="sm"
                variant={isRecording ? "destructive" : "outline"}
                onClick={toggleRecording}
              >
                {isRecording ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
                {isRecording ? "Parar" : "Áudio"}
              </Button>
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
                onDropItem={editor.moveItemToCategory}
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
              <Button size="sm" onClick={handleAddCategory} disabled={!newCatName.trim()}>
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

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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Save, Check, X, UserCheck } from "lucide-react";
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

  const editor = useCategoryEditor(categories, setCategories);

  // Fetch operational managers
  useEffect(() => {
    async function fetchManagers() {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "operational");
      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", roles.map((r) => r.user_id));
        if (profiles) setManagers(profiles);
      }
    }
    fetchManagers();
  }, []);

  const handleSave = async () => {
    if (!meta.storeName.trim()) {
      toast.error("Preencha o nome da loja!");
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

  const checkedTotal = categories.reduce((acc, c) => acc + c.items.filter((i) => i.checked).length, 0);
  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);

  // Progress from operational manager
  const allCheckedItems = categories.flatMap((c) => c.items).filter((i) => i.checked);
  const completedItems = allCheckedItems.filter((i) => i.status === "completed").length;
  const progressPercent = allCheckedItems.length > 0 ? Math.round((completedItems / allCheckedItems.length) * 100) : 0;

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
            {checkedTotal}/{totalItems} itens selecionados
            {id && ` • Execução: ${progressPercent}%`}
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

      {showReport ? (
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

          {/* Assign to manager */}
          {managers.length > 0 && (
            <div className="p-4 rounded-lg border border-border bg-card space-y-2">
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> Atribuir ao Gestor Operacional
              </Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione um gestor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-4">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onEditCategory={editor.editCategory}
                onRemoveCategory={editor.removeCategory}
                onAddItem={editor.addItem}
                onEditItem={editor.editItem}
                onRemoveItem={editor.removeItem}
                onToggleItem={editor.toggleItem}
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

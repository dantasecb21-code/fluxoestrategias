import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStrategies, useCategoryEditor } from "@/hooks/useStrategies";
import { Strategy, StrategyMeta, DEFAULT_CATEGORIES } from "@/types/strategy";
import { StrategyMetaForm } from "@/components/StrategyMetaForm";
import { CategoryCard } from "@/components/CategoryCard";
import { StrategyReport } from "@/components/StrategyReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FileText, Plus, Save, Check, X } from "lucide-react";
import { toast } from "sonner";

interface StrategyBuilderProps {
  strategies: Strategy[];
  createStrategy: (meta: StrategyMeta) => Strategy;
  updateStrategy: (s: Strategy) => void;
}

export function StrategyBuilder({ strategies, createStrategy, updateStrategy }: StrategyBuilderProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const existing = id ? strategies.find((s) => s.id === id) : null;

  const [meta, setMeta] = useState<StrategyMeta>(
    existing?.meta || { storeName: "", managerName: "", operationalManager: "", deadline: "" }
  );
  const [categories, setCategories] = useState(
    existing?.categories ||
      DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        id: Math.random().toString(36).substring(2, 10),
        items: c.items.map((i) => ({ ...i, id: Math.random().toString(36).substring(2, 10), checked: false })),
      }))
  );
  const [showReport, setShowReport] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savedId, setSavedId] = useState<string | null>(id || null);

  const editor = useCategoryEditor(categories, setCategories);

  const currentStrategy: Strategy = {
    id: savedId || "temp",
    meta,
    categories,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleSave = () => {
    if (!meta.storeName.trim()) {
      toast.error("Preencha o nome da loja!");
      return;
    }
    if (savedId) {
      updateStrategy({ ...currentStrategy, id: savedId });
      toast.success("Estratégia atualizada!");
    } else {
      const created = createStrategy(meta);
      // Update with current categories
      updateStrategy({ ...created, categories });
      setSavedId(created.id);
      toast.success("Estratégia criada!");
      navigate(`/estrategia/${created.id}`, { replace: true });
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-heading font-bold text-foreground">
                {isNew ? "Nova Estratégia" : meta.storeName || "Editar Estratégia"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {checkedTotal}/{totalItems} itens selecionados
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReport(!showReport)}
            >
              <FileText className="h-4 w-4 mr-1" /> {showReport ? "Editor" : "Relatório"}
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {showReport ? (
          <StrategyReport strategy={currentStrategy} />
        ) : (
          <>
            <StrategyMetaForm meta={meta} onChange={setMeta} />

            {/* Categories */}
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

            {/* Add Category */}
            {addingCategory ? (
              <div className="flex items-center gap-2 p-4 border border-dashed border-primary/40 rounded-lg">
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nome da nova categoria (ex: Logística, Marketing)"
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
      </main>
    </div>
  );
}

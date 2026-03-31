import { useState } from "react";
import { StrategyCategory, StrategyItem } from "@/types/strategy";
import { generateStrategicText } from "@/lib/strategicTextGenerator";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Pencil, Trash2, Plus, Check, X, ChevronDown, ChevronRight, Sparkles, Loader2, ArrowUp, ArrowDown, GripVertical, MoveRight } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CategoryCardProps {
  category: StrategyCategory;
  allCategories?: StrategyCategory[];
  onEditCategory: (id: string, name: string) => void;
  onRemoveCategory: (id: string) => void;
  onAddItem: (catId: string, item: Omit<StrategyItem, "id" | "checked">) => void;
  onEditItem: (catId: string, itemId: string, updates: Partial<StrategyItem>) => void;
  onRemoveItem: (catId: string, itemId: string) => void;
  onMoveItem?: (catId: string, itemId: string, direction: "up" | "down") => void;
  onMoveItemToCategory?: (fromCatId: string, itemId: string, toCatId: string) => void;
  onDropItem?: (fromCatId: string, itemId: string, toCatId: string) => void;
}

async function fetchAIText(itemName: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-strategic-text", {
      body: { itemName },
    });
    if (error) throw error;
    return data?.text || null;
  } catch {
    return null;
  }
}

export function CategoryCard({
  category,
  allCategories,
  onEditCategory,
  onRemoveCategory,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onMoveItem,
  onMoveItemToCategory,
  onDropItem,
}: CategoryCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [dragOverCat, setDragOverCat] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [catName, setCatName] = useState(category.name);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemText, setEditItemText] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [editGeneratingAI, setEditGeneratingAI] = useState(false);

  const handleSaveCatName = () => {
    if (catName.trim()) {
      onEditCategory(category.id, catName.trim());
    }
    setEditingName(false);
  };

  const handleAddItem = () => {
    if (newItemName.trim()) {
      const text = newItemText.trim() || generateStrategicText(newItemName.trim());
      onAddItem(category.id, { name: newItemName.trim(), text });
      setNewItemName("");
      setNewItemText("");
      setAddingItem(false);
    }
  };

  const handleStartEdit = (item: StrategyItem) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemText(item.text);
  };

  const handleSaveEdit = () => {
    if (editingItemId && editItemName.trim()) {
      const text = editItemText.trim() || generateStrategicText(editItemName.trim());
      onEditItem(category.id, editingItemId, { name: editItemName.trim(), text });
    }
    setEditingItemId(null);
  };

  const handleGenerateAI = async (name: string, isEdit: boolean) => {
    if (!name.trim()) return;
    if (isEdit) setEditGeneratingAI(true);
    else setGeneratingAI(true);

    const aiText = await fetchAIText(name);
    if (aiText) {
      if (isEdit) setEditItemText(aiText);
      else setNewItemText(aiText);
    } else {
      const fallback = generateStrategicText(name);
      if (isEdit) setEditItemText(fallback);
      else setNewItemText(fallback);
      toast.info("IA indisponível, texto gerado localmente.");
    }

    if (isEdit) setEditGeneratingAI(false);
    else setGeneratingAI(false);
  };

  return (
    <Card
      className={`border-border bg-card overflow-hidden transition-colors ${dragOverCat ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOverCat(true); }}
      onDragLeave={() => setDragOverCat(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOverCat(false);
        const fromCatId = e.dataTransfer.getData("fromCatId");
        const itemId = e.dataTransfer.getData("itemId");
        if (fromCatId && itemId && fromCatId !== category.id && onDropItem) {
          onDropItem(fromCatId, itemId, category.id);
        }
      }}
    >
          className="flex items-center gap-2 text-foreground font-heading font-semibold text-lg hover:text-primary transition-colors"
        >
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          {editingName ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="h-8 w-48"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveCatName()}
              />
              <Button size="icon" variant="ghost" onClick={handleSaveCatName} className="h-7 w-7 text-success">
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setEditingName(false)} className="h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <span>{category.name}</span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {category.items.length} itens
          </span>
          {!editingName && (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setEditingName(true); setCatName(category.name); }}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onRemoveCategory(category.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Items — all items are part of strategy, no checkboxes */}
      {expanded && (
        <div className="p-4 space-y-3">
          {category.items.map((item, index) =>
            editingItemId === item.id ? (
              <div key={item.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                <Input
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  placeholder="Nome do item"
                  className="bg-background"
                />
                <Textarea
                  value={editItemText}
                  onChange={(e) => setEditItemText(e.target.value)}
                  placeholder="Texto estratégico (opcional)"
                  rows={2}
                  className="bg-background"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Check className="h-3 w-3 mr-1" /> Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateAI(editItemName, true)}
                    disabled={editGeneratingAI || !editItemName.trim()}
                  >
                    {editGeneratingAI ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Gerar com IA
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingItemId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">
                    - {item.name}
                  </p>
                  {item.text && <p className="text-xs text-muted-foreground mt-0.5">{item.text}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onMoveItem && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onMoveItem(category.id, item.id, "up")}
                        disabled={index === 0}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onMoveItem(category.id, item.id, "down")}
                        disabled={index === category.items.length - 1}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => handleStartEdit(item)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onRemoveItem(category.id, item.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )
          )}

          {/* Add Item */}
          {addingItem ? (
            <div className="p-3 rounded-lg border border-dashed border-primary/40 space-y-2">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Nome do item (ex: Ajustar categorias do cardápio)"
                className="bg-background"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && newItemName.trim() && handleAddItem()}
              />
              <Textarea
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Texto estratégico (opcional - a IA pode gerar depois)"
                rows={2}
                className="bg-background"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddItem} disabled={!newItemName.trim()}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerateAI(newItemName, false)}
                  disabled={generatingAI || !newItemName.trim()}
                >
                  {generatingAI ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Gerar com IA
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingItem(false); setNewItemName(""); setNewItemText(""); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddingItem(true)}
              className="text-primary hover:text-primary/80 hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar item
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

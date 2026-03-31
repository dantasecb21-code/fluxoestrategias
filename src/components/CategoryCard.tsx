import { useState } from "react";
import { StrategyCategory, StrategyItem } from "@/types/strategy";
import { generateStrategicText, validateStrategicText } from "@/lib/strategicTextGenerator";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pencil, Trash2, Plus, Check, X, ChevronDown, ChevronRight, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CategoryCardProps {
  category: StrategyCategory;
  onEditCategory: (id: string, name: string) => void;
  onRemoveCategory: (id: string) => void;
  onAddItem: (catId: string, item: Omit<StrategyItem, "id" | "checked">) => void;
  onEditItem: (catId: string, itemId: string, updates: Partial<StrategyItem>) => void;
  onRemoveItem: (catId: string, itemId: string) => void;
  onToggleItem: (catId: string, itemId: string) => void;
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
  onEditCategory,
  onRemoveCategory,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onToggleItem,
}: CategoryCardProps) {
  const [expanded, setExpanded] = useState(true);
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

  const checkedCount = category.items.filter((i) => i.checked).length;

  const handleSaveCatName = () => {
    if (catName.trim()) {
      onEditCategory(category.id, catName.trim());
    }
    setEditingName(false);
  };

  const handleAddItem = () => {
    if (newItemName.trim() && newItemText.trim()) {
      onAddItem(category.id, { name: newItemName.trim(), text: newItemText.trim() });
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
    if (editingItemId && editItemName.trim() && editItemText.trim()) {
      onEditItem(category.id, editingItemId, { name: editItemName.trim(), text: editItemText.trim() });
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
      // Fallback to local generator
      const fallback = generateStrategicText(name);
      if (isEdit) setEditItemText(fallback);
      else setNewItemText(fallback);
      toast.info("IA indisponível, texto gerado localmente.");
    }

    if (isEdit) setEditGeneratingAI(false);
    else setGeneratingAI(false);
  };

  const handleItemNameChange = (value: string) => {
    setNewItemName(value);
    // Auto-generate with local fallback immediately for responsiveness
    if (value.trim()) {
      setNewItemText(generateStrategicText(value));
    } else {
      setNewItemText("");
    }
  };

  return (
    <Card className="border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          onClick={() => setExpanded(!expanded)}
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
            {checkedCount}/{category.items.length}
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

      {/* Items */}
      {expanded && (
        <div className="p-4 space-y-3">
          {category.items.map((item) =>
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
                  placeholder="Texto estratégico"
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
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => onToggleItem(category.id, item.id)}
                  className="mt-0.5 border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    - {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.text}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                onChange={(e) => handleItemNameChange(e.target.value)}
                placeholder="Nome do item (ex: Ajustar categorias do cardápio)"
                className="bg-background"
                autoFocus
              />
               <Textarea
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Texto estratégico vinculado"
                  rows={2}
                  className="bg-background"
                />
                {newItemName.trim() && newItemText.trim() && (() => {
                  const warning = validateStrategicText(newItemName, newItemText);
                  return warning ? (
                    <Alert variant="destructive" className="py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{warning}</AlertDescription>
                    </Alert>
                  ) : null;
                })()}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddItem} disabled={!newItemName.trim() || !newItemText.trim()}>
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

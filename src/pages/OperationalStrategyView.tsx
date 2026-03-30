import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { StrategyCategory, ItemStatus, STATUS_LABELS, STATUS_COLORS } from "@/types/strategy";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ChevronDown, ChevronRight, Save, MessageSquare } from "lucide-react";
import { toast } from "sonner";

function calcProgress(categories: StrategyCategory[]) {
  const allItems = categories.flatMap((c) => c.items).filter((i) => i.checked);
  if (allItems.length === 0) return { percent: 0, completed: 0, inProgress: 0, pending: 0, total: 0 };
  const completed = allItems.filter((i) => i.status === "completed").length;
  const inProgress = allItems.filter((i) => i.status === "in_progress").length;
  const pending = allItems.filter((i) => !i.status || i.status === "pending").length;
  const total = allItems.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { percent, completed, inProgress, pending, total };
}

export default function OperationalStrategyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { strategies, updateStrategy, loading } = useDbStrategies();

  const strategy = strategies.find((s) => s.id === id);
  const [categories, setCategories] = useState<StrategyCategory[]>([]);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [editingObs, setEditingObs] = useState<string | null>(null);
  const [obsValue, setObsValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (strategy) {
      setCategories(JSON.parse(JSON.stringify(strategy.categories)));
      const expanded: Record<string, boolean> = {};
      strategy.categories.forEach((c) => { expanded[c.id] = true; });
      setExpandedCats(expanded);
    }
  }, [strategy]);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  if (!strategy) return <div className="flex items-center justify-center h-64 text-muted-foreground">Estratégia não encontrada.</div>;

  const progress = calcProgress(categories);

  const handleStatusChange = (catId: string, itemId: string, status: ItemStatus) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, status } : i)) }
          : c
      )
    );
  };

  const handleSaveObs = (catId: string, itemId: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, observation: obsValue } : i)) }
          : c
      )
    );
    setEditingObs(null);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateStrategy(strategy.id, { categories });
    toast.success("Progresso salvo com sucesso!");
    setSaving(false);
  };

  const checkedCategories = categories
    .map((c) => ({ ...c, items: c.items.filter((i) => i.checked) }))
    .filter((c) => c.items.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-heading font-bold text-xl text-foreground">
              Estratégia Inicial – {strategy.store_name}
            </h1>
            <div className="text-xs text-muted-foreground mt-0.5">
              Gestor Estratégico: {strategy.manager_name} • Prazo: {strategy.deadline}
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Progress overview */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-foreground">Progresso Geral</h2>
          <span className="font-heading font-bold text-2xl text-primary">{progress.percent}%</span>
        </div>
        <Progress value={progress.percent} className="h-3 mb-3" />
        <div className="flex gap-6 text-sm">
          <span className="text-success font-medium">{progress.completed} concluídos</span>
          <span className="text-primary font-medium">{progress.inProgress} em andamento</span>
          <span className="text-warning font-medium">{progress.pending} pendentes</span>
        </div>
      </Card>

      {/* Categories */}
      {checkedCategories.map((cat) => (
        <Card key={cat.id} className="overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-muted/30 transition-colors"
            onClick={() => setExpandedCats((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
          >
            <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
              {expandedCats[cat.id] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              {cat.name}
            </h3>
            <span className="text-xs text-muted-foreground">
              {cat.items.filter((i) => i.status === "completed").length}/{cat.items.length} concluídos
            </span>
          </button>

          {expandedCats[cat.id] && (
            <div className="divide-y divide-border">
              {cat.items.map((item) => {
                const status = item.status || "pending";
                return (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-foreground leading-relaxed">{item.text}</p>
                      </div>
                      <Select
                        value={status}
                        onValueChange={(v) => handleStatusChange(cat.id, item.id, v as ItemStatus)}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            <span className="text-warning">● </span>Pendente
                          </SelectItem>
                          <SelectItem value="in_progress">
                            <span className="text-primary">● </span>Em andamento
                          </SelectItem>
                          <SelectItem value="completed">
                            <span className="text-success">● </span>Concluído
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Observation */}
                    {editingObs === item.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={obsValue}
                          onChange={(e) => setObsValue(e.target.value)}
                          placeholder="Adicionar observação..."
                          rows={2}
                          className="bg-background text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleSaveObs(cat.id, item.id)}>
                            Salvar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingObs(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingObs(item.id); setObsValue(item.observation || ""); }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MessageSquare className="h-3 w-3" />
                        {item.observation ? item.observation : "Adicionar observação"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ))}

      {checkedCategories.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum item selecionado nesta estratégia.</p>
        </Card>
      )}
    </div>
  );
}

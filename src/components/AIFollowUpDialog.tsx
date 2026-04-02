import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AIQuestion {
  id: string;
  label: string;
  type: "text" | "select";
  options?: string[];
}

interface AIDetection {
  type: string;
  detected: string;
  questions: AIQuestion[];
  directAction?: string;
}

interface AIFollowUpDialogProps {
  open: boolean;
  onClose: () => void;
  detection: AIDetection | null;
  onSubmit: (answers: Record<string, string>) => void;
  loading: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  store_name: "Nome da Loja",
  delivery_area: "Área de Entrega",
  store_category: "Categoria da Loja",
  store_logo: "Logo da Loja",
  cover_photo: "Foto de Capa",
  category_title: "Título de Categoria",
  item_title: "Título do Item",
  item_description: "Descrição do Item",
  item_price: "Preço do Item",
  move_item: "Mover Item",
  addons_group: "Grupo de Adicionais",
  prep_time: "Tempo de Preparo",
  delivery_method: "Método de Entrega",
  payment_methods: "Formas de Pagamento",
  other: "Outro",
};

export function AIFollowUpDialog({ open, onClose, detection, onSubmit, loading }: AIFollowUpDialogProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    onSubmit(answers);
    setAnswers({});
  };

  if (!detection) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            IA identificou: {TYPE_LABELS[detection.type] || detection.type}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {detection.detected && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Detectado no print:</p>
              <p className="text-sm text-foreground">{detection.detected}</p>
            </div>
          )}

          {detection.questions.map((q) => (
            <div key={q.id} className="space-y-1.5">
              <Label className="text-sm text-foreground">{q.label}</Label>
              {q.type === "select" && q.options ? (
                <Select value={answers[q.id] || ""} onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {q.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Digite aqui..."
                  className="bg-background"
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || detection.questions.some((q) => !answers[q.id]?.trim())}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {loading ? "Gerando..." : "Gerar Estratégia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

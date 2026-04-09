import { useState } from "react";
import { StrategyCategory, StrategyItem } from "@/types/strategy";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { generateStrategicText } from "@/lib/strategicTextGenerator";

function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

interface FreeTextDistributorProps {
  categories: StrategyCategory[];
  onAddItem: (catId: string, item: Omit<StrategyItem, "id" | "checked">) => void;
}

interface ParsedLine {
  id: string;
  text: string;
  categoryId: string;
}

export function FreeTextDistributor({ categories, onAddItem }: FreeTextDistributorProps) {
  const [freeText, setFreeText] = useState("");
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [step, setStep] = useState<"write" | "distribute">("write");

  const handleParse = () => {
    const lines = freeText
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      toast.error("Escreva pelo menos um item!");
      return;
    }

    const defaultCatId = categories.length > 0 ? categories[0].id : "";
    setParsedLines(lines.map((text) => ({ id: generateId(), text, categoryId: defaultCatId })));
    setStep("distribute");
  };

  const handleDistribute = () => {
    let added = 0;
    for (const line of parsedLines) {
      if (line.categoryId && line.text.trim()) {
        const name = line.text.length > 60 ? line.text.substring(0, 60) + "..." : line.text;
        const strategicDescription = generateStrategicText(line.text);
        onAddItem(line.categoryId, { name: `- ${name}`, text: strategicDescription || line.text });
        added++;
      }
    }
    toast.success(`${added} itens adicionados às categorias!`);
    setFreeText("");
    setParsedLines([]);
    setStep("write");
  };

  const updateLineCategory = (lineId: string, catId: string) => {
    setParsedLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, categoryId: catId } : l)));
  };

  const removeLine = (lineId: string) => {
    setParsedLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const setAllToCategory = (catId: string) => {
    setParsedLines((prev) => prev.map((l) => ({ ...l, categoryId: catId })));
  };

  if (categories.length === 0) return null;

  return (
    <Card className="p-4 border-primary/20 bg-primary/5 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="font-heading font-semibold text-sm text-foreground">Caixa de texto livre</h3>
      </div>

      {step === "write" ? (
        <>
          <p className="text-xs text-muted-foreground">
            Escreva os itens da estratégia livremente, um por linha. Depois você distribui nas categorias.
          </p>
          <Textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder={"Foto de capa desatualizada\nLogo em baixa qualidade\nDescrição da loja genérica\nCategorias do cardápio desorganizadas\n..."}
            className="bg-background min-h-[120px] text-sm"
          />
          <Button size="sm" onClick={handleParse} disabled={!freeText.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Organizar itens ({freeText.split("\n").filter((l) => l.trim()).length})
          </Button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Selecione a categoria de cada item. Use "Aplicar a todos" para mover todos de uma vez.
          </p>

          {/* Apply all */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Aplicar a todos:</span>
            <Select onValueChange={setAllToCategory}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Selecione categoria..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lines */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {parsedLines.map((line) => (
              <div key={line.id} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                <p className="flex-1 text-sm text-foreground truncate min-w-0">{line.text}</p>
                <Select value={line.categoryId} onValueChange={(v) => updateLineCategory(line.id, v)}>
                  <SelectTrigger className="h-7 w-40 text-xs shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" onClick={() => removeLine(line.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleDistribute} disabled={parsedLines.length === 0}>
              <Send className="h-4 w-4 mr-1" /> Adicionar {parsedLines.length} itens
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStep("write")}>
              Voltar
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

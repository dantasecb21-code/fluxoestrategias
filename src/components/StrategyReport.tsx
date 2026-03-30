import { Strategy } from "@/types/strategy";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, FileText } from "lucide-react";
import { toast } from "sonner";

interface StrategyReportProps {
  strategy: Strategy;
}

export function StrategyReport({ strategy }: StrategyReportProps) {
  const { meta, categories } = strategy;

  const activeCategories = categories
    .map((c) => ({ ...c, items: c.items.filter((i) => i.checked) }))
    .filter((c) => c.items.length > 0);

  const generateText = () => {
    let report = `📋 Estratégia Inicial - ${meta.storeName}\n\n`;
    report += `👤 Gestor Estratégico - ${meta.managerName}\n`;
    report += `👤 Gestor Operacional - ${meta.operationalManager}\n`;
    report += `📅 Prazo - ${meta.deadline}\n\n`;
    report += `${"─".repeat(40)}\n\n`;

    activeCategories.forEach((cat) => {
      report += `📌 ${cat.name}\n\n`;
      cat.items.forEach((item) => {
        report += `• ${item.name}\n  → ${item.text}\n\n`;
      });
    });

    if (activeCategories.length === 0) {
      report += "⚠️ Nenhum item selecionado.\n";
    }

    return report;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText());
    toast.success("Estratégia copiada para a área de transferência!");
  };

  return (
    <Card className="border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-bold text-xl text-foreground">Relatório Gerado</h2>
        </div>
        <Button onClick={handleCopy} size="sm">
          <Copy className="h-4 w-4 mr-1" /> Copiar
        </Button>
      </div>

      <div className="bg-muted/30 rounded-lg p-5 space-y-4 font-mono text-sm">
        <div className="text-center">
          <h3 className="text-primary font-heading font-bold text-lg">
            Estratégia Inicial - {meta.storeName}
          </h3>
          <div className="text-muted-foreground mt-2 space-y-1">
            <p>Gestor Estratégico - {meta.managerName}</p>
            <p>Gestor Operacional - {meta.operationalManager}</p>
            <p>Prazo - {meta.deadline}</p>
          </div>
        </div>

        <div className="border-t border-border" />

        {activeCategories.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhum item selecionado. Marque os itens desejados.</p>
        ) : (
          activeCategories.map((cat) => (
            <div key={cat.id}>
              <h4 className="font-heading font-semibold text-primary mb-2">📌 {cat.name}</h4>
              <ul className="space-y-2">
                {cat.items.map((item) => (
                  <li key={item.id} className="text-foreground">
                    <span className="font-medium">• {item.name}</span>
                    <p className="text-muted-foreground ml-3">→ {item.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

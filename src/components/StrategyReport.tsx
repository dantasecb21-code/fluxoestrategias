import { StrategyCategory } from "@/types/strategy";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/utils";
import { STRATEGY_TYPE_LABELS, StrategyType } from "@/hooks/useDbStrategies";

interface StrategyReportProps {
  storeName: string;
  managerName: string;
  operationalManager: string;
  deadline: string;
  categories: StrategyCategory[];
  strategyType?: StrategyType;
  observation?: string;
}

export function StrategyReport({ storeName, managerName, operationalManager, deadline, categories, strategyType = "initial", observation }: StrategyReportProps) {
  const activeCategories = categories.filter((c) => c.items.length > 0);
  const typeLabel = STRATEGY_TYPE_LABELS[strategyType] || "Estratégia";

  const generateText = () => {
    let report = `*${typeLabel} – ${storeName}*\n\n`;
    report += `*Gestor Estratégico:* ${managerName}\n`;
    report += `*Gestor Operacional:* ${operationalManager}\n`;
    report += `*Prazo:* ${formatDateBR(deadline)}\n\n`;

    if (observation) {
      report += `*Observação:* ${observation}\n\n`;
    }

    activeCategories.forEach((cat) => {
      report += `*${cat.name}*\n\n`;
      cat.items.forEach((item) => {
        report += `${item.name}: ${item.text}\n\n`;
      });
    });

    if (activeCategories.length === 0) {
      report += "Nenhum item nesta estratégia.\n";
    }

    return report.trim();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText());
    toast.success("Estratégia copiada!");
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

      <div className="bg-muted/30 rounded-lg p-6 space-y-6">
        <div className="text-center space-y-2">
          <h3 className="font-heading font-bold text-xl text-primary">
            {typeLabel} – {storeName}
          </h3>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p>Gestor Estratégico: {managerName}</p>
            <p>Gestor Operacional: {operationalManager}</p>
            <p>Prazo: {formatDateBR(deadline)}</p>
          </div>
        </div>

        {observation && (
          <>
            <div className="border-t border-border" />
            <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-0.5">Observação</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{observation}</p>
              </div>
            </div>
          </>
        )}

        <div className="border-t border-border" />

        {activeCategories.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhum item adicionado. Adicione itens nas categorias.</p>
        ) : (
          activeCategories.map((cat) => (
            <div key={cat.id}>
              <h4 className="font-heading font-semibold text-foreground text-lg mb-3">{cat.name}</h4>
              <div className="space-y-3">
                {cat.items.map((item) => (
                  <p key={item.id} className="text-foreground text-sm leading-relaxed">
                    {item.name}: {item.text}
                  </p>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

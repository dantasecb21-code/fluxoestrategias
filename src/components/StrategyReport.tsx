import { StrategyCategory } from "@/types/strategy";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, FileText } from "lucide-react";
import { toast } from "sonner";

interface StrategyReportProps {
  storeName: string;
  managerName: string;
  operationalManager: string;
  deadline: string;
  categories: StrategyCategory[];
  whatsapp?: string;
}

export function StrategyReport({ storeName, managerName, operationalManager, deadline, categories, whatsapp }: StrategyReportProps) {
  // All items are part of the strategy now (no more checked filter)
  const activeCategories = categories.filter((c) => c.items.length > 0);

  const generateText = () => {
    let report = `*Estratégia Inicial – ${storeName}*\n\n`;
    report += `*Gestor Estratégico:* ${managerName}\n`;
    report += `*Gestor Operacional:* ${operationalManager}\n`;
    report += `*Prazo:* ${deadline}\n\n`;

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

  const handleWhatsApp = () => {
    if (!whatsapp) {
      toast.error("WhatsApp do gestor não cadastrado.");
      return;
    }
    const cleanNumber = whatsapp.replace(/\D/g, "");
    const number = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;
    const text = encodeURIComponent(generateText());
    window.open(`https://wa.me/${number}?text=${text}`, "_blank");
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
            Estratégia Inicial – {storeName}
          </h3>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p>Gestor Estratégico: {managerName}</p>
            <p>Gestor Operacional: {operationalManager}</p>
            <p>Prazo: {deadline}</p>
          </div>
        </div>

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

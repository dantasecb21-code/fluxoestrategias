import { StrategyMeta } from "@/types/strategy";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Store, User, CalendarDays } from "lucide-react";

interface StrategyMetaFormProps {
  meta: StrategyMeta;
  onChange: (meta: StrategyMeta) => void;
}

export function StrategyMetaForm({ meta, onChange }: StrategyMetaFormProps) {
  const update = (key: keyof StrategyMeta, value: string) => {
    onChange({ ...meta, [key]: value });
  };

  return (
    <Card className="border-border bg-card p-5">
      <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
        <Store className="h-5 w-5 text-primary" />
        Informações da Estratégia
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs flex items-center gap-1">
            <Store className="h-3 w-3" /> Nome da Loja
          </Label>
          <Input value={meta.storeName} onChange={(e) => update("storeName", e.target.value)} placeholder="Ex: Hamburgueria do João" className="bg-background" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs flex items-center gap-1">
            <User className="h-3 w-3" /> Gestor Estratégico
          </Label>
          <Input value={meta.managerName} onChange={(e) => update("managerName", e.target.value)} placeholder="Seu nome" className="bg-background" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs flex items-center gap-1">
            <User className="h-3 w-3" /> Gestor Operacional
          </Label>
          <Input value={meta.operationalManager} onChange={(e) => update("operationalManager", e.target.value)} placeholder="Nome do operacional" className="bg-background" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> Prazo
          </Label>
          <Input type="date" value={meta.deadline} onChange={(e) => update("deadline", e.target.value)} className="bg-background" />
        </div>
      </div>
    </Card>
  );
}

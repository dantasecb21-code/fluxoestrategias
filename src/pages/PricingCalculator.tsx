import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, Percent, Truck, AlertCircle } from "lucide-react";

export default function PricingCalculator() {
  const [itemCost, setItemCost] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [hasLogistics, setHasLogistics] = useState(false);
  const paymentProcessingRate = 3.2;
  const logisticsExtra = 5;

  const cost = parseFloat(itemCost) || 0;
  const commission = parseFloat(commissionRate) || 0;

  const totalFeePercent = commission + paymentProcessingRate;
  const logisticsAdd = hasLogistics ? logisticsExtra : 0;

  // Price = (cost + logistics) / (1 - totalFee/100)
  const suggestedPrice = totalFeePercent < 100
    ? (cost + logisticsAdd) / (1 - totalFeePercent / 100)
    : 0;

  const profit = suggestedPrice - cost - logisticsAdd;
  const feeAmount = suggestedPrice * (totalFeePercent / 100);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Calculadora de Precificação
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Defina o preço ideal dos itens considerando todas as taxas da plataforma
        </p>
      </div>

      {/* Info alert */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-foreground space-y-1">
            <p className="font-medium">Como usar:</p>
            <p className="text-muted-foreground">
              Verifique as taxas atuais nos pedidos da plataforma. A comissão e distribuição variam por loja. 
              A taxa de processamento de pagamento é fixa em 3.2% por pedido.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              Taxas e Custos
            </CardTitle>
            <CardDescription>Preencha com base nas taxas dos pedidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="item-cost">Custo do Item (R$)</Label>
              <Input
                id="item-cost"
                type="number"
                placeholder="Ex: 25.00"
                value={itemCost}
                onChange={(e) => setItemCost(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commission">Comissão e Distribuição (Tarifa 99Food) (%)</Label>
              <Input
                id="commission"
                type="number"
                placeholder="Ex: 20"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                Verifique a % atual na aba de taxas dos pedidos da loja
              </p>
            </div>

            <div className="space-y-2">
              <Label>Taxa de Processamento de Pagamento</Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50">
                <Badge variant="secondary">Fixa</Badge>
                <span className="text-sm font-medium">{paymentProcessingRate}% por pedido</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="logistics" className="cursor-pointer flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  Custos Logísticos?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Pode chegar até R$9,50 — adicionamos R$5,00 ao preço
                </p>
              </div>
              <Switch
                id="logistics"
                checked={hasLogistics}
                onCheckedChange={setHasLogistics}
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Resultado
            </CardTitle>
            <CardDescription>Preço sugerido para o item</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {cost > 0 ? (
              <>
                <div className="rounded-xl border-2 border-primary/50 bg-primary/5 p-6 text-center space-y-1">
                  <p className="text-sm text-muted-foreground">Preço Sugerido</p>
                  <p className="text-4xl font-bold text-primary">
                    R$ {suggestedPrice.toFixed(2)}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Custo do item</span>
                    <span className="font-medium">R$ {cost.toFixed(2)}</span>
                  </div>
                  {hasLogistics && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Custo logístico adicionado</span>
                      <span className="font-medium">+ R$ {logisticsExtra.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total de taxas ({totalFeePercent.toFixed(1)}%)</span>
                    <span className="font-medium text-destructive">- R$ {feeAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Receita líquida estimada</span>
                    <span className="font-medium text-green-600">R$ {(suggestedPrice - feeAmount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Resumo:</strong> Com comissão de {commission}% + processamento de {paymentProcessingRate}%
                    {hasLogistics ? " + logística" : ""}, o preço de <strong>R$ {suggestedPrice.toFixed(2)}</strong> cobre 
                    todos os custos e mantém a margem.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Preencha o custo do item e a comissão para ver o resultado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

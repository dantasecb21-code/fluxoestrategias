import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, Percent, Truck, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";

type CalculatorMode = "fixed" | "ifood";

const IFOOD_RATE_PRESETS = [23, 27, 30];

export default function PricingCalculator() {
  const [mode, setMode] = useState<CalculatorMode>("fixed");
  const [itemCost, setItemCost] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [hasLogistics, setHasLogistics] = useState(false);
  const [ifoodRate, setIfoodRate] = useState("23");
  const paymentProcessingRate = 3.2;
  const logisticsExtra = 5;

  const cost = parseFloat(itemCost) || 0;
  const commission = parseFloat(commissionRate) || 0;

  const totalFeePercent = commission + paymentProcessingRate;
  const logisticsAdd = hasLogistics ? logisticsExtra : 0;
  const selectedIfoodRate = parseFloat(ifoodRate) || 0;

  // Price = (cost + logistics) / (1 - totalFee/100), rounded to x.99
  const rawPrice = totalFeePercent < 100
    ? (cost + logisticsAdd) / (1 - totalFeePercent / 100)
    : 0;
  const suggestedPrice = rawPrice > 0 ? Math.ceil(rawPrice) - 0.01 : 0;

  const profit = suggestedPrice - cost - logisticsAdd;
  const feeAmount = suggestedPrice * (totalFeePercent / 100);
  const ifoodRawPrice = selectedIfoodRate < 100
    ? cost / (1 - selectedIfoodRate / 100)
    : 0;
  const ifoodSuggestedPrice = ifoodRawPrice > 0 ? Math.ceil(ifoodRawPrice) - 0.01 : 0;
  const ifoodIncrease = ifoodSuggestedPrice - cost;
  const activeSuggestedPrice = mode === "ifood" ? ifoodSuggestedPrice : suggestedPrice;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Calculadora de Precificação
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Defina o preço ideal dos itens considerando todas as taxas da plataforma
        </p>
      </div>

      <button
        type="button"
        onClick={() => setMode((current) => current === "fixed" ? "ifood" : "fixed")}
        className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40 md:w-auto md:min-w-80"
        aria-pressed={mode === "ifood"}
      >
        <div className="flex items-center gap-3">
          {mode === "ifood" ? (
            <ToggleRight className="h-6 w-6 text-success" />
          ) : (
            <ToggleLeft className="h-6 w-6 text-primary" />
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">{mode === "ifood" ? "Modo iFood" : "Modo 99food"}</p>
            <p className="text-xs text-muted-foreground">Clique para trocar a calculadora</p>
          </div>
        </div>
        <Badge variant={mode === "ifood" ? "default" : "secondary"}>{mode === "ifood" ? "iFood" : "Fixo"}</Badge>
      </button>

      {/* Info alert */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-foreground space-y-1">
            <p className="font-medium">Como usar:</p>
            <p className="text-muted-foreground">
              {mode === "ifood" 
                ? "Escolha uma taxa padrão ou personalize a taxa desejada para encontrar o preço final."
                : "Verifique as taxas atuais nos pedidos da plataforma. A comissão e distribuição variam por loja. A taxa de processamento de pagamento é fixa em 3.2% por pedido."}
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
            <CardDescription>{mode === "ifood" ? "Preencha a taxa desejada" : "Preencha com base nas taxas dos pedidos"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="item-cost">Preço do Balcão(R$)</Label>
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

            {mode === "ifood" ? (
              <>
                <div className="space-y-2">
                  <Label>Taxa desejada (%)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {IFOOD_RATE_PRESETS.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setIfoodRate(String(rate))}
                        className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${Number(ifoodRate) === rate ? "border-success bg-success text-success-foreground" : "bg-background hover:bg-muted/50"}`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ifood-rate">Personalizar taxa (%)</Label>
                  <Input
                    id="ifood-rate"
                    type="number"
                    placeholder="Ex: 25"
                    value={ifoodRate}
                    onChange={(e) => setIfoodRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="commission">Comissão e Distribuição (Tarifa fixa) (%)</Label>
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
              </>
            )}
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
                <div className={`rounded-xl border-2 p-6 text-center space-y-1 ${mode === "ifood" ? "border-success/50 bg-success/5" : "border-primary/50 bg-primary/5"}`}>
                  <p className="text-sm text-muted-foreground">Preço Sugerido</p>
                  <p className={`text-4xl font-bold ${mode === "ifood" ? "text-success" : "text-primary"}`}>
                    R$ {activeSuggestedPrice.toFixed(2)}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço do Balcão</span>
                    <span className="font-medium">R$ {cost.toFixed(2)}</span>
                  </div>
                  {mode === "ifood" ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Taxa desejada ({selectedIfoodRate.toFixed(1)}%)</span>
                        <span className="font-medium text-primary">+ R$ {ifoodIncrease.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Soma a mais no preço</span>
                        <span className="font-medium text-success">R$ {ifoodIncrease.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {hasLogistics && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Custo logístico adicionado</span>
                          <span className="font-medium text-primary">+ R$ {logisticsExtra.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Taxas da plataforma ({totalFeePercent.toFixed(1)}%)</span>
                        <span className="font-medium text-primary">+ R$ {feeAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t pt-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço final com taxas incluídas</span>
                    <span className="font-medium text-success">R$ {activeSuggestedPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    {mode === "ifood" ? (
                      <><strong>Resumo:</strong> Com taxa de {selectedIfoodRate.toFixed(1)}%, o preço aumenta <strong>R$ {ifoodIncrease.toFixed(2)}</strong> e fica em <strong>R$ {ifoodSuggestedPrice.toFixed(2)}</strong>.</>
                    ) : (
                      <><strong>Resumo:</strong> Com comissão de {commission}% + processamento de {paymentProcessingRate}%{hasLogistics ? " + logística" : ""}, o preço de <strong>R$ {suggestedPrice.toFixed(2)}</strong> cobre todos os custos e mantém a margem.</>
                    )}
                  </p>
                </div>

                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <p className="text-xs text-warning font-medium mb-1">⚠️ Observação importante</p>
                  <p className="text-xs text-muted-foreground">
                    A plataforma possui um processo criterioso para atualização de preços. Dependendo do cenário, 
                    pode ser necessário modificar o <strong>título</strong> e a <strong>descrição</strong> do item 
                    ao realizar o aumento de preço.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Preencha o preço do balcão e a comissão para ver o resultado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

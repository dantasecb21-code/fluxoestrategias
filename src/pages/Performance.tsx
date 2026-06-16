import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  Store,
  TrendingUp,
  Minus,
  Sparkles,
  Clock,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Sun,
  Search,
  FileSpreadsheet,
  FileText,
  Table as TableIcon,
  BarChart3,
} from "lucide-react";

type Tone = "primary" | "success" | "muted" | "info" | "warning" | "destructive";

const metricCards: {
  label: string;
  value: string;
  sub: string;
  icon: any;
  tone: Tone;
}[] = [
  { label: "LOJAS ATIVAS", value: "383", sub: "360 ativas + 23 em cancelamento", icon: Store, tone: "primary" },
  { label: "CRESCIMENTO", value: "163", sub: "43%", icon: TrendingUp, tone: "success" },
  { label: "ESTÁVEL", value: "64", sub: "17%", icon: Minus, tone: "muted" },
  { label: "LOJAS NOVAS", value: "46", sub: "12%", icon: Sparkles, tone: "info" },
  { label: "- 30 DIAS", value: "0", sub: "0% (Média: 0.0%)", icon: Clock, tone: "primary" },
  { label: "QUEDA", value: "110", sub: "29%", icon: TrendingDown, tone: "destructive" },
  { label: "EM CANCELAMENTO", value: "23", sub: "Risco", icon: AlertTriangle, tone: "warning" },
];

const highlightCards = [
  { label: "GESTOR +CRESCIMENTO", name: "Luis Guilherme", value: "20", sub: "de 45 lojas", tone: "success" as Tone },
  { label: "GESTOR +QUEDA", name: "Antonio", value: "16", sub: "de 35 lojas", tone: "destructive" as Tone },
  { label: "ESTRATEGISTA +CRESCIMENTO", name: "FILIPE", value: "92", sub: "de 204 lojas", tone: "success" as Tone },
  { label: "ESTRATEGISTA +QUEDA", name: "FILIPE", value: "57", sub: "de 204 lojas", tone: "destructive" as Tone },
];

const gestores = [
  { nome: "Luis Guilherme", cresc: 20, estavel: 7, nova: 7, d30: 0, queda: 11, total: 45 },
  { nome: "Shey", cresc: 20, estavel: 7, nova: 3, d30: 0, queda: 9, total: 39 },
  { nome: "Clara", cresc: 18, estavel: 5, nova: 2, d30: 0, queda: 8, total: 33 },
  { nome: "Bruna A.", cresc: 18, estavel: 6, nova: 3, d30: 0, queda: 5, total: 32 },
  { nome: "Luiza", cresc: 15, estavel: 4, nova: 1, d30: 0, queda: 11, total: 31 },
  { nome: "Filipe", cresc: 15, estavel: 4, nova: 0, d30: 0, queda: 11, total: 30 },
  { nome: "Antonio", cresc: 12, estavel: 6, nova: 1, d30: 0, queda: 16, total: 35 },
  { nome: "Martin", cresc: 11, estavel: 8, nova: 10, d30: 0, queda: 12, total: 41 },
  { nome: "Rafael", cresc: 10, estavel: 5, nova: 2, d30: 0, queda: 8, total: 25 },
];

const estrategistas = [
  { nome: "FILIPE", cresc: 92, estavel: 33, nova: 22, d30: 0, queda: 57, total: 204 },
  { nome: "GABRIELA", cresc: 70, estavel: 31, nova: 23, d30: 0, queda: 53, total: 177 },
];

const lojas = [
  { id: "0365", loja: "Padaria Nova Era", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Queda", data: "25/07/2024", ltv: "22 meses", var: "-15%", atual: "R$ 10.893", ant: "R$ 18.809", ini: "R$ 22.225" },
  { id: "0367", loja: "Ossobuco Sopas e Pastéis", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Queda", data: "19/08/2024", ltv: "21 meses", var: "-14%", atual: "R$ 12.918", ant: "R$ 20.530", ini: "R$ 23.885" },
  { id: "0366", loja: "Dengosa de Moema", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Crescimento", data: "07/08/2024", ltv: "21 meses", var: "+23%", atual: "R$ 46.364", ant: "R$ 59.949", ini: "R$ 48.564" },
  { id: "0355", loja: "Restaurante Tempero Caseiro", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Estável", data: "30/10/2024", ltv: "18 meses", var: "-7%", atual: "R$ 11.360", ant: "R$ 16.907", ini: "R$ 18.234" },
  { id: "0694", loja: "Tempero Caseiro II", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Crescimento", data: "08/04/2026", ltv: "1 mês", var: "+52%", atual: "R$ 3.313", ant: "R$ 3.968", ini: "R$ 2.607" },
  { id: "0364", loja: "Restaurante Sirius", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Queda", data: "18/07/2024", ltv: "22 meses", var: "-29%", atual: "R$ 5.217", ant: "R$ 7.778", ini: "R$ 11.008" },
  { id: "0215", loja: "Pizzaria Efatá", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Crescimento", data: "19/03/2026", ltv: "2 meses", var: "+13%", atual: "R$ 6.088", ant: "R$ 10.256", ini: "R$ 9.047" },
  { id: "0381", loja: "Restaurante da Vovó", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Crescimento", data: "10/02/2026", ltv: "3 meses", var: "+35%", atual: "R$ 11.289", ant: "R$ 20.952", ini: "R$ 15.559" },
  { id: "0229", loja: "Oma Sushi", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Estável", data: "17/03/2026", ltv: "2 meses", var: "+8%", atual: "R$ 37.069", ant: "R$ 40.207", ini: "R$ 37.391" },
  { id: "0374", loja: "Boteco da Estação", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Estável", data: "09/03/2026", ltv: "2 meses", var: "-5%", atual: "R$ 3.434", ant: "R$ 6.953", ini: "R$ 7.301" },
  { id: "0376", loja: "Restaurante Bifão", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Estável", data: "09/03/2026", ltv: "2 meses", var: "+7%", atual: "R$ 3.386", ant: "R$ 3.736", ini: "R$ 3.506" },
  { id: "0377", loja: "Yakisobar", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Estável", data: "09/03/2026", ltv: "2 meses", var: "+5%", atual: "R$ 17.792", ant: "R$ 25.988", ini: "R$ 24.775" },
  { id: "0379", loja: "Feijoada das irmãs", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Estável", data: "02/03/2026", ltv: "2 meses", var: "+6%", atual: "R$ 2.847", ant: "R$ 2.878", ini: "R$ 2.713" },
  { id: "0606", loja: "Pastel Caiuca", gestor: "Martin", estrategista: "GABRIELA", platf: "iFood", statusLoja: "Ativa", status: "Crescimento", data: "25/02/2026", ltv: "2 meses", var: "+288%", atual: "R$ 8.164", ant: "R$ 12.482", ini: "R$ 3.215" },
];

function toneText(tone: Tone) {
  switch (tone) {
    case "success": return "text-success";
    case "destructive": return "text-destructive";
    case "warning": return "text-warning";
    case "info": return "text-info";
    case "muted": return "text-muted-foreground";
    default: return "text-primary";
  }
}
function toneBg(tone: Tone) {
  switch (tone) {
    case "success": return "bg-success/15 text-success";
    case "destructive": return "bg-destructive/15 text-destructive";
    case "warning": return "bg-warning/15 text-warning";
    case "info": return "bg-info/15 text-info";
    case "muted": return "bg-muted text-muted-foreground";
    default: return "bg-primary/15 text-primary";
  }
}

function StatusPill({ value }: { value: string }) {
  const map: Record<string, string> = {
    Crescimento: "bg-success/15 text-success border-success/30",
    Queda: "bg-destructive/15 text-destructive border-destructive/30",
    Estável: "bg-muted text-muted-foreground border-border",
    Ativa: "bg-success/15 text-success border-success/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[value] || "bg-muted text-muted-foreground border-border"}`}>
      {value}
    </span>
  );
}

export default function Performance() {
  const [tab, setTab] = useState<"performance" | "previsibilidade">("performance");
  const [view, setView] = useState<"todos" | "crescimento" | "estavel" | "nova" | "d30" | "queda">("todos");
  const [search, setSearch] = useState("");
  const [tableView, setTableView] = useState<"table" | "chart">("table");

  const now = useMemo(() => new Date().toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), []);

  const filteredLojas = lojas.filter((l) => {
    if (search && !`${l.id} ${l.loja} ${l.gestor} ${l.estrategista}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (view === "crescimento" && l.status !== "Crescimento") return false;
    if (view === "estavel" && l.status !== "Estável") return false;
    if (view === "queda" && l.status !== "Queda") return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-heading font-bold text-3xl tracking-tight text-foreground">PERFORMANCE</h1>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Painel de Gestão</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-card border border-border p-1">
            <button
              onClick={() => setTab("performance")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${tab === "performance" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >Performance</button>
            <button
              onClick={() => setTab("previsibilidade")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${tab === "previsibilidade" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >Previsibilidade</button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full"><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full"><Sun className="h-3.5 w-3.5" /></Button>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-success/30 bg-success/10 text-success font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />AO VIVO
          </span>
          <span className="whitespace-nowrap">{now}</span>
        </div>
      </div>

      <div>
        <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 rounded-full font-bold uppercase tracking-wider text-[10px]">iFood</Badge>
        <span className="ml-3 text-xs uppercase tracking-wider text-muted-foreground">383 lojas ativas</span>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {metricCards.map((m) => (
          <Card key={m.label} className="p-4 bg-card/60 backdrop-blur border-border/60 hover:border-primary/40 transition">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight">{m.label}</span>
              <span className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${toneBg(m.tone)}`}>
                <m.icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-3 font-heading font-bold text-4xl text-foreground tabular-nums">{m.value}</div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${toneBg(m.tone).split(" ")[0]}`} />
              {m.sub}
            </div>
          </Card>
        ))}
      </div>

      {/* Highlight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {highlightCards.map((h) => (
          <Card key={h.label} className="p-5 bg-card/60 backdrop-blur border-border/60">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{h.label}</div>
            <div className="mt-1.5 text-foreground font-heading text-lg">{h.name}</div>
            <div className={`mt-1 font-heading font-bold text-5xl tabular-nums ${toneText(h.tone)}`}>{h.value}</div>
            <div className="mt-3 text-xs text-muted-foreground">{h.sub}</div>
          </Card>
        ))}
      </div>

      {/* Por Gestor / Estrategista */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankTable title="Por Gestor" rows={gestores} />
        <RankTable title="Por Estrategista" rows={estrategistas} />
      </div>

      {/* Lojas table */}
      <Card className="bg-card/60 backdrop-blur border-border/60">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60">
          <div className="font-heading font-semibold text-foreground">Lojas</div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 bg-success hover:bg-success/90 text-success-foreground gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</Button>
            <Button size="sm" className="h-8 gap-1.5"><FileText className="h-3.5 w-3.5" />PDF</Button>
          </div>
        </div>

        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border/60">
          {[
            { k: "todos", label: "Todos" },
            { k: "crescimento", label: "Crescimento (163)" },
            { k: "estavel", label: "Estável (64)" },
            { k: "nova", label: "Nova (46)" },
            { k: "d30", label: "- 30 dias (0)" },
            { k: "queda", label: "Queda (110)" },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setView(f.k as any)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition border ${
                view === f.k
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >{f.label}</button>
          ))}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por ID, loja, gestor ou estrategista..." className="pl-8 h-9 bg-background/60 rounded-full text-xs" />
          </div>
          <Select defaultValue="todos">
            <SelectTrigger className="w-[140px] h-9 rounded-full text-xs"><SelectValue placeholder="Gestor: todos" /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Gestor: todos</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="todos">
            <SelectTrigger className="w-[170px] h-9 rounded-full text-xs"><SelectValue placeholder="Estrategista: todos" /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Estrategista: todos</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="variacao">
            <SelectTrigger className="w-[130px] h-9 rounded-full text-xs"><SelectValue placeholder="Variação" /></SelectTrigger>
            <SelectContent><SelectItem value="variacao">Variação ↑</SelectItem></SelectContent>
          </Select>
        </div>

        <div className="px-4 py-2 flex items-center justify-between text-xs">
          <Select defaultValue="todas">
            <SelectTrigger className="w-[150px] h-8 rounded-full text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todas">Todas as lojas</SelectItem></SelectContent>
          </Select>
          <div className="text-muted-foreground font-semibold">{filteredLojas.length} lojas</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-y border-border/60">
                {["", "ID", "Loja", "Gestor", "Estrategista", "Plataforma", "Status Loja", "Status", "Data Entrada", "LTV", "Variação", "Fat. Atual", "Fat. Mês Ant.", "Fat. Inicial"].map((h, i) => (
                  <th key={i} className="font-medium py-3 px-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLojas.map((l) => {
                const isPos = l.var.startsWith("+");
                const isNeg = l.var.startsWith("-");
                return (
                  <tr key={l.id} className="border-b border-border/40 hover:bg-muted/30 transition">
                    <td className="py-3 px-3 text-muted-foreground">▾</td>
                    <td className="py-3 px-3 font-semibold text-foreground">{l.id}</td>
                    <td className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">{l.loja}</td>
                    <td className="py-3 px-3 text-foreground">{l.gestor}</td>
                    <td className="py-3 px-3 font-semibold text-foreground">{l.estrategista}</td>
                    <td className="py-3 px-3 text-foreground">{l.platf}</td>
                    <td className="py-3 px-3"><StatusPill value={l.statusLoja} /></td>
                    <td className="py-3 px-3"><StatusPill value={l.status} /></td>
                    <td className="py-3 px-3 text-foreground whitespace-nowrap">{l.data}</td>
                    <td className="py-3 px-3 text-foreground whitespace-nowrap">{l.ltv}</td>
                    <td className={`py-3 px-3 font-bold tabular-nums ${isPos ? "text-success" : isNeg ? "text-destructive" : "text-muted-foreground"}`}>{l.var}</td>
                    <td className="py-3 px-3 font-bold text-foreground tabular-nums whitespace-nowrap">{l.atual}</td>
                    <td className="py-3 px-3 text-muted-foreground tabular-nums whitespace-nowrap">{l.ant}</td>
                    <td className="py-3 px-3 text-muted-foreground tabular-nums whitespace-nowrap">{l.ini}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function RankTable({ title, rows }: { title: string; rows: any[] }) {
  const [mode, setMode] = useState<"table" | "chart">("table");
  return (
    <Card className="bg-card/60 backdrop-blur border-border/60">
      <div className="p-4 flex items-center justify-between border-b border-border/60">
        <div className="font-heading font-semibold text-foreground">{title}</div>
        <div className="inline-flex rounded-full border border-border p-0.5">
          <button onClick={() => setMode("table")} className={`h-7 w-7 inline-flex items-center justify-center rounded-full ${mode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <TableIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setMode("chart")} className={`h-7 w-7 inline-flex items-center justify-center rounded-full ${mode === "chart" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <BarChart3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-medium py-2.5 px-4">Nome</th>
              <th className="text-right font-medium py-2.5 px-3"><span className="text-success">▲</span> Cresc</th>
              <th className="text-right font-medium py-2.5 px-3"><span className="text-muted-foreground">●</span> Estável</th>
              <th className="text-right font-medium py-2.5 px-3"><span className="text-info">✦</span> Nova</th>
              <th className="text-right font-medium py-2.5 px-3"><span className="text-primary">✦</span> -30d</th>
              <th className="text-right font-medium py-2.5 px-3"><span className="text-destructive">▼</span> Queda</th>
              <th className="text-right font-medium py-2.5 px-4">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.nome} className="border-t border-border/40 hover:bg-muted/30">
                <td className="py-2.5 px-4 font-semibold text-foreground whitespace-nowrap">{r.nome}</td>
                <td className="py-2.5 px-3 text-right font-bold text-success tabular-nums">{r.cresc}</td>
                <td className="py-2.5 px-3 text-right text-foreground tabular-nums">{r.estavel}</td>
                <td className="py-2.5 px-3 text-right font-bold text-info tabular-nums">{r.nova}</td>
                <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">{r.d30}</td>
                <td className="py-2.5 px-3 text-right font-bold text-destructive tabular-nums">{r.queda}</td>
                <td className="py-2.5 px-4 text-right font-bold text-foreground tabular-nums">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
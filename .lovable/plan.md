

## Plano Completo — Evolução do Sistema (Etapa por Etapa)

Este é um projeto grande com 4 etapas principais. Vamos implementar uma por vez, com sua aprovação a cada passo.

---

### Etapa 1 — Campo "Plataforma" (99Food / iFood)

**Banco de dados:**
- Adicionar coluna `platform` (text, default `'99food'`) na tabela `strategies`
- Atualizar estratégias existentes para `'99food'` (já são todas dessa plataforma)

**Interface:**
- Adicionar seletor de plataforma no `StrategyMetaForm` (obrigatório na criação)
- Badge visual: 99Food (amarelo) / iFood (vermelho) em todas as listagens
- Filtro por plataforma no Dashboard, Ranking, Pendentes e Calendário

**Código afetado:**
- `supabase/migrations/` — nova migration
- `src/components/StrategyMetaForm.tsx` — campo plataforma
- `src/hooks/useDbStrategies.ts` — incluir `platform` no tipo e nas operações
- `src/pages/Dashboard.tsx`, `OperationalRanking.tsx`, `PendingStrategies.tsx`, `StrategyCalendar.tsx` — filtros + badges

---

### Etapa 2 — Campos de Data + Status Derivados

**Banco de dados:**
- Adicionar colunas: `started_at` (timestamp), `completed_at` (timestamp)
- `created_at` já existe, `deadline` já existe

**Lógica (calculada no frontend, sem colunas extras):**
- `status_prazo`: No Prazo / Atrasada / Vencendo em breve / Finalizada no prazo / Finalizada atrasada
- `status_operacional`: Pendente / Em otimização / Concluída

**Automação:**
- `started_at` = preenchido automaticamente quando o primeiro item mudar para "in_progress"
- `completed_at` = preenchido quando status vira "approved"

**Código afetado:**
- `supabase/migrations/` — nova migration
- `src/lib/strategyStatus.ts` — novas funções de status derivado
- `src/hooks/useDbStrategies.ts` — salvar `started_at`/`completed_at` automaticamente
- `src/pages/OperationalStrategyView.tsx` — trigger de `started_at`

---

### Etapa 3 — Integração Google Sheets

**Pré-requisito:** Você vai precisar criar uma Service Account no Google Cloud Console. Vou te guiar passo a passo quando chegarmos nessa etapa.

**Implementação:**
- Edge Function `sync-to-sheets` que recebe dados da estratégia e envia/atualiza no Google Sheets
- Trigger via database webhook (INSERT/UPDATE na tabela strategies)
- Usa ID da estratégia como chave para não duplicar linhas

**Estrutura da planilha (15 colunas):**
ID | Data Criação | Loja | Plataforma | Tipo | Gestor Strategic | Gestor Operacional | Status Operacional | Status Prazo | Data Início | Data Prevista | Data Conclusão | Tempo Execução | Observações

**Secrets necessários:**
- `GOOGLE_SERVICE_ACCOUNT_JSON` — credenciais da service account
- `GOOGLE_SHEET_ID` — ID da planilha

---

### Etapa 4 — Métricas e Dashboard na Planilha

Com os dados na planilha, ela já vai permitir calcular:
- Ranking de gestores (concluídas, no prazo, atrasadas)
- Operação atual (em otimização, pendentes)
- Prazos (atrasadas, vencendo em breve)
- Produção diária por gestor
- Rastreabilidade de lojas por gestor

Esses cálculos serão feitos via fórmulas do Google Sheets ou um dashboard externo (Google Looker Studio).

---

### Resumo técnico

| Etapa | Arquivos alterados | Migration |
|-------|--------------------|-----------|
| 1 | 6-7 arquivos | Sim (add `platform`) |
| 2 | 4-5 arquivos | Sim (add `started_at`, `completed_at`) |
| 3 | 1 edge function nova + trigger | Sim (webhook) |
| 4 | Fórmulas na planilha | Não |

---

**Posso começar pela Etapa 1 (campo plataforma + badges + filtros)?**


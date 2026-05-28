## Visão geral

Adicionar 3 grandes blocos ao Fluxo de Estratégias:
1. **Estudo de Concorrência** — fluxo paralelo do Vitor
2. **Adaptação do Algoritmo** — etapa pós-conclusão da estratégia, com aprovação do Braço Direito (assistente estratégico)
3. **Ranking mensal de Estrategistas**

---

## 1. Estudo de Concorrência (Vitor)

**Nova tabela `competitor_studies`**
- `id`, `strategy_id` (FK lógico), `store_name`, `platform`, `strategic_user_id` (estrategista responsável)
- `status`: `pending` | `in_progress` | `completed`
- `assigned_to` (uuid do Vitor — usuário específico)
- `started_at`, `completed_at`, `notes`
- `created_at`, `updated_at`

**Trigger automático**: ao inserir uma estratégia nova (tipo `initial`), gerar 1 registro em `competitor_studies` com status `pending`, atribuído ao Vitor (definido por flag/role nova `competitor_analyst` ou um user_id configurável).

**Como identificar o "Vitor"**: criar nova role `competitor_analyst` no enum `app_role`. Quem tiver essa role recebe as demandas. (Pergunto ao usuário no final se prefere fixar por email do Vitor em vez de role.)

**Nova página `/estudo-concorrencia`** (visível para `competitor_analyst` + `admin`):
- 3 abas: Pendentes / Em andamento / Concluídas
- Cards com loja, plataforma, estrategista responsável, data de criação
- Botões: "Iniciar" (→ in_progress) e "Marcar como feito" (→ completed)

**Visibilidade para estrategistas**: na página principal de estratégias, mostrar um badge/status do estudo de concorrência ao lado de cada loja vinculada ("Estudo: pendente/em andamento/concluído").

**RLS**:
- `competitor_analyst` e `admin` veem tudo; podem update
- `strategic` vê só dos seus (`strategic_user_id = auth.uid()` ou `assigned_to` da estratégia)
- `strategic_assistant` vê dos estrategistas que segue

---

## 2. Adaptação do Algoritmo

**Novo status na `strategies`**: `in_algorithm_adaptation` (entre `approved` e `completed_final`).

**Novos campos na `strategies`**:
- `algorithm_adaptation_started_at` (timestamp)
- `algorithm_adaptation_deadline` (timestamp — auto `started_at + 10 dias`)
- `algorithm_adaptation_status`: `pending` | `approved` | `returned`
- `algorithm_return_reason` (text)
- `algorithm_approved_by`, `algorithm_approved_at`

**Fluxo**:
- Quando gestor operacional manda para aprovação (`pending_approval`) E admin aprova → status vira `in_algorithm_adaptation`, seta `algorithm_adaptation_started_at = now()` e deadline `+10 dias`.
- Aparece em **nova aba "Adaptação do Algoritmo"** para o Braço Direito (strategic_assistant) revisar.
- Braço Direito tem 2 botões:
  - **Aprovar** → status final `completed_final`
  - **Devolver ao Estrategista** → abre dialog para motivo, salva em `algorithm_return_reason`, manda status para `returned_to_strategist`, notifica o estrategista responsável (cria registro em `strategy_history`).
- Estrategista vê notificação e refaz; ao reenviar, volta para o ciclo.

**Página**: nova rota `/adaptacao-algoritmo` no sidebar do strategic_assistant + admin.

---

## 3. Ranking de Estrategistas

**Nova rota `/ranking-estrategistas`** (visível para admin + strategic_assistant + strategic):
- Filtros: mês (seletor), estrategista (multi-select), status
- Para cada estrategista, calcular do mês:
  - Estratégias feitas (count `completed_at` no mês)
  - Estratégias devolvidas (count `algorithm_return_reason != ''` no mês)
  - Taxa de aprovação = aprovadas / (aprovadas + devolvidas)
  - Em adaptação do algoritmo (count com status `in_algorithm_adaptation`)
  - Concluídas após aprovação (status `completed_final`)
- Apresentação visual: tabela ordenável + cards top 3 com medalhas
- Tudo client-side via query agregada sobre `strategies` (similar a `OperationalRanking`).

---

## Migrations (resumo)

1. `competitor_studies` table + RLS + grants
2. Adicionar role `competitor_analyst` ao enum `app_role`
3. Trigger `on_strategy_created_create_study` em `strategies`
4. Alter `strategies`: adicionar colunas de adaptação do algoritmo
5. Atualizar lógica no `useDbStrategies` para transição automática de `approved` → `in_algorithm_adaptation`

---

## Arquivos a criar/editar

**Criar**:
- `src/pages/CompetitorStudies.tsx` (painel do Vitor)
- `src/pages/AlgorithmAdaptation.tsx` (painel do Braço Direito)
- `src/pages/StrategistRanking.tsx` (ranking)
- `src/hooks/useCompetitorStudies.ts`
- 3 migrations

**Editar**:
- `src/App.tsx` (rotas)
- `src/components/AppSidebar.tsx` (menus por role)
- `src/hooks/useAuth.tsx` (adicionar `competitor_analyst` ao tipo `AppRole`)
- `src/hooks/useDbStrategies.ts` (auto-transição para `in_algorithm_adaptation`, ações de aprovar/devolver)
- `src/lib/strategyStatus.ts` (novos status labels)
- `src/pages/Auth.tsx` (opção de seleção de role no signup, se quiser permitir Vitor se cadastrar — ou criar manualmente via admin)

---

## Perguntas antes de começar

1. **"Vitor" é uma role nova (`competitor_analyst`) ou um user_id fixo?** Recomendo role — admin atribui pelo painel de aprovação.
2. **Estudo de concorrência só para estratégias `initial`?** Ou também para `alignment` / `retention`?
3. **Devolução do Algoritmo**: ao devolver, o status volta para `in_progress` do operacional ou para um estado novo `pending_strategist_review`?
4. **Ranking**: incluir também o **estudo de concorrência** como métrica do Vitor (ranking separado) ou só estrategistas?

Vou seguir com as respostas padrão (role nova, todas estratégias, novo estado `pending_strategist_review`, só estrategistas) se não houver objeção.
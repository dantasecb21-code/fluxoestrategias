## Objetivo
Criar uma nova seção **Ocorrências** abaixo de "Atividades" no menu lateral, onde gestores operacionais registram ocorrências de lojas e gestores estratégicos / auxiliares / admins respondem ou resolvem.

## Modelo de dados (nova tabela `occurrences`)
Campos:
- `store_id` (text) — ex.: "0751"
- `occurrence_date` (date) — data da ocorrência
- `occurrence_time` (text) — horário (HH:MM)
- `description` (text) — texto da ocorrência
- `operational_manager_id` (uuid) — quem criou (auth.uid())
- `operational_manager_name` (text) — denormalizado p/ exibição
- `status` (text) — `open` | `resolved`
- `resolution` (text) — resposta dada
- `resolved_by` (uuid) / `resolved_by_name` (text) / `resolved_at` (timestamptz)
- `created_at`, `updated_at`

### RLS
- **Operacional**: pode INSERT (auth.uid() = operational_manager_id) e SELECT/UPDATE só das próprias ocorrências.
- **Estratégico, Auxiliar Estratégico, Admin**: SELECT e UPDATE em todas (para responder/resolver).
- **Admin**: DELETE.

## UI

### Menu lateral (`AppSidebar.tsx`)
Adicionar item **Ocorrências** (ícone `AlertCircle` do lucide) logo abaixo de "Atividades", visível para todos os roles (admin, estratégico, auxiliar, operacional).

### Nova rota `/ocorrencias` → `src/pages/Occurrences.tsx`

**Para Gestor Operacional:**
- Botão "Nova Ocorrência" abre dialog com formulário:
  - ID da loja
  - Data (date picker, default hoje)
  - Horário (input HH:MM, default agora)
  - Descrição (textarea)
  - Nome do gestor (auto-preenchido com displayName, readonly)
- Lista das próprias ocorrências com status (Aberta / Resolvida) e, se resolvida, a resposta.

**Para Estratégico / Auxiliar / Admin:**
- Lista todas as ocorrências, com filtros: Status (Abertas/Resolvidas/Todas) e busca por loja/gestor.
- Cards mostrando: ID loja, data/hora, descrição, gestor operacional, status.
- Botão "Responder/Resolver" em ocorrências abertas → dialog com textarea de resolução → marca como `resolved` e grava `resolved_by`, `resolved_at`.
- Pode reabrir ocorrência resolvida (admin/estratégico).

### Visual
Seguir padrão das páginas existentes (`PendingActivities.tsx`): cards com badges de status, layout responsivo, tokens semânticos do design system.

## Detalhes técnicos
- Hook `useOccurrences.ts` (similar ao `useDbStrategies`) — fetch + realtime via supabase channel + create/update.
- Habilitar realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrences;`
- Trigger `update_updated_at_column` em UPDATE.
- Rota adicionada em `App.tsx`.
- Sem badge de contador no menu nesta primeira versão (pode ser adicionado depois).

## Confirmações
1. **Operacional vê só as próprias ocorrências** ou todas as ocorrências da plataforma dele? (proposto: só as próprias)
2. **Notificação** quando uma ocorrência é respondida? (proposto: não nesta versão — pode ser adicionado depois via NotificationBell)
3. **Anexos/imagens** nas ocorrências? (proposto: não nesta versão)

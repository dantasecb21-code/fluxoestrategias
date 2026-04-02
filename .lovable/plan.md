

# Plano de Melhorias Estruturais do Sistema

Este plano cobre todas as 9 areas solicitadas, organizadas em etapas de implementacao.

---

## Etapa 1: Correcoes rapidas (UI/texto/formato)

### 1A. Renomear assistente
- `src/pages/AssistantChat.tsx` linha 166: trocar "Chatinho Gepeto - 99Food" por "Chatinho Gepeto"

### 1B. Formato de data DD-MM-AAAA
- Criar funcao utilitaria `formatDateBR(dateStr)` que converte "2026-04-07" em "07-04-2026"
- Aplicar em: `Dashboard.tsx` (linha 85), `PendingStrategies.tsx` (linha 77), `StrategyReport.tsx`, `OperationalStrategyView.tsx` (linha 85), `StrategyBuilder.tsx` (deadline display)

### 1C. Remover funcionalidade de audio
- `src/pages/StrategyBuilder.tsx`: remover todo o bloco de gravacao de audio (estados `isRecording`, `isTranscribing`, `recordingTime`, refs, funcoes `startRecording`, `stopRecording`, `transcribeAudio`, `formatTime`, e os botoes de gravar/parar na UI linhas 464-493)
- Remover import de `Mic`, `Square`

---

## Etapa 2: Correcao de logica de status

### 2A. Bug do "i.checked" nos calculos
O bug principal esta em `ManagersList.tsx` e `UserProfile.tsx` que filtram `i.checked` antes de calcular status. Como os itens gerados pela IA nao tem `checked: true`, o sistema ignora todos os itens.

**Correcoes:**
- `ManagersList.tsx` funcao `calcManagerStats` (linha 35): remover `.filter((i: any) => i.checked)` - considerar TODOS os itens
- `UserProfile.tsx` linhas 95, 105: mesma correcao, remover filtro `i.checked`
- `PendingStrategies.tsx`: ja esta correto (nao filtra checked)

### 2B. Status "Em andamento" correto
A logica atual: se algum item tem `status === "in_progress"` OU `status === "completed"` (mas nao todos completed), a estrategia esta em andamento. Isso ja e correto, mas so funciona depois de remover o filtro `i.checked`.

### 2C. Estrategias concluidas fora de "Pendentes"
`PendingStrategies.tsx` ja filtra `p.percent < 100`. Apos correcao do checked, estrategias 100% concluidas serao removidas automaticamente.

---

## Etapa 3: Informacoes do gestor (email + foto)

### 3A. Exibir email no perfil
- `UserProfile.tsx`: buscar email via `supabase.auth.admin` nao e possivel no client. Alternativa: adicionar coluna `email` na tabela `profiles`.
- **Migracao SQL**: `ALTER TABLE profiles ADD COLUMN email text NOT NULL DEFAULT '';`
- Atualizar trigger `handle_new_user` para salvar `NEW.email` no campo `email` do profile.
- `UserProfile.tsx`: exibir campo email com icone `Mail`

### 3B. Foto + email na selecao de gestor (StrategyBuilder)
- `StrategyBuilder.tsx` funcao `fetchManagers`: incluir `avatar_url, email` no select de profiles
- Interface `Manager`: adicionar `avatar_url` e `email`
- No `Select` de gestor operacional: mostrar avatar pequeno + nome + email

### 3C. Foto na lista de gestores (ManagersList)
- `ManagersList.tsx` funcao `fetchManagers`: incluir `avatar_url` no select
- Interface `OperationalManager`: adicionar `avatar_url`
- Exibir avatar ao lado do nome (substituir o circulo de ranking por avatar real quando disponivel)

---

## Etapa 4: IA com aprendizado continuo

### 4A. Tabela de contexto da IA
- **Migracao SQL**: criar tabela `ai_context_entries` com colunas: `id`, `user_id`, `content` (text original), `structured_summary` (text resumido pela IA), `category` (text), `created_at`
- RLS: admin e strategic podem ler tudo, usuarios podem inserir

### 4B. Armazenar inputs no "Escreva livremente"
- `StrategyBuilder.tsx`: apos `handleOrganizeWithAI` ter sucesso, inserir o `freeText` original e as categorias geradas na tabela `ai_context_entries`

### 4C. Edge function `organize-strategy` com contexto
- Buscar ultimos 20 registros de `ai_context_entries` e incluir no system prompt como "HISTORICO DE ESTRATEGIAS ANTERIORES"
- Instrucao para a IA: "Use esse historico para manter consistencia e evitar repeticao"

### 4D. Detalhamento passo a passo
- Atualizar system prompt do `organize-strategy` para instruir a IA a gerar itens com passo a passo detalhado (ex: "1. Verifique X... 2. Ajuste Y... 3. Valide Z...")
- Adicionar instrucao: "Cada item deve conter uma sequencia logica de acoes, nao apenas uma frase"

---

## Etapa 5: Interpretacao de imagens

### 5A. Upload de imagem no StrategyBuilder
- Adicionar botao de upload de imagem no box "Escreva livremente"
- Usar storage bucket existente `avatars` ou criar novo bucket `strategy-images`
- Enviar imagem como base64 para a edge function

### 5B. Edge function com suporte a imagem
- Atualizar `organize-strategy` para aceitar campo `imageBase64` opcional
- Usar modelo multimodal (gemini-2.5-flash suporta imagens) para analisar o print
- A IA deve identificar problemas no print e sugerir melhorias cruzando com o contexto aprendido

---

## Etapa 6: Permissoes e visibilidade centralizada

### 6A. Default role para novos usuarios
- O trigger `handle_new_user` ja define role `strategic` como default. Isso ja garante que novos usuarios sao estrategistas com acesso total.
- As RLS policies ja permitem que admin e strategic vejam tudo.
- **Nenhuma alteracao necessaria** - o sistema ja funciona assim.

### 6B. Dashboard centralizado com lista de gestores + status
- Nao e necessario criar nova pagina - o `Dashboard.tsx` e `ManagersList.tsx` ja cumprem esse papel.
- Adicionar no Dashboard um resumo rapido: total de gestores, estrategias pendentes/em andamento/concluidas.

---

## Resumo tecnico das alteracoes

| Tipo | Arquivo/Recurso | Descricao |
|------|-----------------|-----------|
| Migracao | SQL | Adicionar coluna `email` em `profiles`, criar tabela `ai_context_entries`, atualizar trigger |
| Edge Function | `organize-strategy` | Contexto historico, passo a passo, suporte a imagens |
| Frontend | `AssistantChat.tsx` | Renomear titulo |
| Frontend | `StrategyBuilder.tsx` | Remover audio, adicionar upload de imagem, salvar contexto IA, mostrar foto/email do gestor |
| Frontend | `ManagersList.tsx` | Adicionar foto, corrigir calculo de status |
| Frontend | `UserProfile.tsx` | Exibir email, corrigir calculo de status |
| Frontend | `PendingStrategies.tsx` | Formato de data |
| Frontend | `Dashboard.tsx` | Formato de data, resumo de gestores |
| Frontend | `StrategyReport.tsx` | Formato de data |
| Utilitario | `src/lib/utils.ts` | Funcao `formatDateBR` |


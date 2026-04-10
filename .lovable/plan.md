

# Corrigir rastreamento de datas de início e conclusão das estratégias

## Problema identificado

O código atual em `useDbStrategies.ts` tem a lógica de auto-preenchimento de `started_at` e `completed_at`, mas **não está funcionando** — todas as 31 estratégias estão com esses campos `null`. Dois bugs:

1. **`started_at`**: A lógica depende de `params.categories` ser passado com itens já em "in_progress", mas o estado `strategies` pode estar desatualizado no momento da verificação (stale closure).
2. **`completed_at`**: Está configurado para preencher quando status muda para `approved`, mas você quer que seja quando o operacional envia para aprovação (`pending_approval`).

## O que será feito

### 1. Corrigir lógica de `started_at`
- Manter o trigger: quando o primeiro item de categoria muda de status (para `in_progress` ou `completed`)
- Buscar o estado atual da estratégia direto do banco (não do state local) para evitar dados desatualizados
- Garantir que só preenche uma vez (se `started_at` já existe, não sobrescreve)

### 2. Corrigir lógica de `completed_at`
- Mudar o trigger de `approved` para `pending_approval` (quando o operacional envia para aprovação)
- Se a estratégia for devolvida e reenviada, atualizar o `completed_at` com a nova data

### 3. Preencher dados retroativos
- Usar a tabela `strategy_history` para estimar datas das estratégias passadas:
  - `started_at` → `created_at` da estratégia (já que não há registro do primeiro item alterado)
  - `completed_at` → data do primeiro registro de mudança para `pending_approval` no histórico
- Executar via SQL UPDATE direto no banco

### 4. Forçar re-sync na planilha
- Após preencher os dados retroativos, disparar um sync completo para atualizar a planilha com as datas corretas

## Arquivos alterados
- `src/hooks/useDbStrategies.ts` — corrigir lógica de auto-preenchimento
- Migration SQL — preencher dados retroativos
- Trigger de sync para atualizar planilha


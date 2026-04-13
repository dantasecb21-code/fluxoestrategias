

# Plano: Limpar linhas órfãs da planilha

## Problema
O `sync-to-sheets` envia apenas estratégias ativas (`deleted_at IS NULL`), mas o Google Apps Script nunca remove linhas de estratégias que foram excluídas. Resultado: linhas com apenas ID e dados vazios/desatualizados.

## Causa raiz
A Edge Function não envia um sinal de "exclusão" para a planilha quando uma estratégia é soft-deleted. As linhas permanecem na planilha indefinidamente.

## Solução

### 1. Adicionar ação "delete" na Edge Function `sync-to-sheets`
Quando o bulk sync rodar, após sincronizar as 40 ativas, enviar uma lista de IDs que devem ser removidos da planilha (os soft-deleted).

Alterar a Edge Function para:
- Buscar os IDs de estratégias com `deleted_at IS NOT NULL`
- Enviar cada ID com uma flag `action: "delete"` para o webhook do Google Sheets
- O Google Apps Script precisa tratar essa ação removendo a linha correspondente

### 2. Adicionar payload de exclusão
```typescript
// Novo payload para deletar linhas
{ id: "xxx", action: "delete" }
```

A função `sendToSheets` será estendida para suportar um payload mínimo com `action: "delete"`.

### 3. Integração no bulk sync
No fluxo `sync_all`:
1. Sincronizar as 40 estratégias ativas (como já faz)
2. Buscar estratégias com `deleted_at IS NOT NULL`
3. Para cada uma, enviar `{ id, action: "delete" }` ao webhook

### Limitação
O Google Apps Script precisa estar preparado para receber a ação `"delete"` e remover a linha. Se o script não suportar isso, as linhas continuarão lá. Nesse caso, a alternativa é enviar as linhas deletadas com todos os campos vazios exceto o ID, para "limpar" visualmente.

### Alternativa mais simples (sem depender do Apps Script)
Enviar as estratégias deletadas com campos vazios (store_name vazio, status vazio, etc.) para que o Apps Script sobrescreva a linha com dados em branco, efetivamente "limpando" a linha.

## Risco
- Nenhum dado será perdido no banco de dados
- Apenas afeta a planilha do Google Sheets
- As estratégias deletadas continuam no banco com `deleted_at` preenchido

## Arquivos alterados
- `supabase/functions/sync-to-sheets/index.ts` — adicionar lógica de limpeza de linhas deletadas no bulk sync


## Problema

O botão "Salvar" em `src/pages/StrategyBuilder.tsx` não bloqueia cliques repetidos enquanto a primeira chamada ainda está em andamento. Resultado: dois cliques rápidos criam duas estratégias para a mesma loja (foi o que aconteceu com a Mega Master Pizzaria Teresópolis — duas linhas com 1 segundo de diferença).

## Mudanças

**Arquivo:** `src/pages/StrategyBuilder.tsx`

1. Adicionar estado `saving` (boolean).
2. No `handleSave`:
   - Se `saving` for `true`, retornar imediatamente (guarda contra reentrância).
   - Setar `saving = true` antes da operação e `false` no `finally`.
   - Envolver toda a lógica em `try/finally` pra garantir que o estado destrava mesmo em erro.
3. No botão "Salvar" do header (linha 356):
   - `disabled={saving}`
   - Trocar ícone por `Loader2` animado quando `saving`
   - Texto vira "Salvando..."

## Resultado

- Cliques extras enquanto o primeiro request ainda processa são ignorados.
- Usuário vê feedback visual claro (botão desabilitado + spinner).
- Sem mudanças no banco nem em outros arquivos.

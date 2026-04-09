

## Diagnóstico

O sistema já usa o **Lovable AI** (gratuito, sem custo adicional), que está configurado corretamente com a `LOVABLE_API_KEY`. Os logs mostram que a edge function `organize-strategy` está ativa, mas não há logs de requisições recentes — o que indica que o erro pode ser:

1. **Rate limit (429)** — muitas requisições em pouco tempo
2. **Timeout** — a função demora demais (prompts muito grandes com contexto + treinamentos)
3. **Erro silencioso** — o frontend captura o erro mas não mostra detalhes úteis

**Não é necessário integrar ChatGPT.** O Lovable AI já é gratuito e funciona. O problema é técnico e pode ser resolvido com melhorias na robustez da edge function.

## Plano de Correção

### 1. Melhorar tratamento de erros na edge function
- Adicionar logs mais detalhados em cada etapa (`console.log` antes e depois de `callAI`)
- Capturar e logar o body da resposta quando o gateway retorna erro
- Adicionar timeout de 25s no `fetch` para evitar travamento

### 2. Melhorar feedback no frontend
- Mostrar mensagens de erro mais específicas ao usuário (rate limit, timeout, etc.)
- Adicionar retry automático (1 tentativa extra) quando o erro for temporário (429/500)

### 3. Reduzir tamanho do prompt
- Limitar o bloco de contexto (`ai_context_entries`) a 10 entradas ao invés de 20
- Limitar o conteúdo de treinamentos a 500 caracteres por curso
- Isso reduz chances de timeout e erros de parsing

### Arquivos alterados
- `supabase/functions/organize-strategy/index.ts` — melhor error handling, logs, redução de contexto
- `src/pages/StrategyBuilder.tsx` — mensagens de erro mais claras + retry automático


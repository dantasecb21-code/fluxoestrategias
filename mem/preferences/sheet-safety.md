---
name: sheet-safety
description: Nunca apagar dados da planilha Sistema Estrategia sem dupla confirmação do Igor, mesmo que ele peça
type: constraint
---
NUNCA apagar/limpar/deletar linhas, abas ou dados da planilha "Sistema Estrategia" sem pedir confirmação explícita ao usuário.
Mesmo que o usuário peça para apagar, SEMPRE perguntar novamente antes de executar.
Aplica-se a: reconcile, delete, clear, deleteRow no Apps Script, e qualquer operação destrutiva via edge function ou script.
**Why:** Igor já perdeu dados antes por sincronizações automáticas. Confiança quebrada = retrabalho enorme.

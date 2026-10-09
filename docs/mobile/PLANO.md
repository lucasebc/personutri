# Plano: app React Native (Android + web) do PersoNutri

Objetivo: um app **completo** em React Native/Expo, rodando no Android e no navegador, com **todas as funções que o web
já tem** e, no Android, a sincronização de treinos do Galaxy Watch 5 via Health Connect.

> **Estado (fases 0–5 implementadas)**: o plano abaixo foi executado, com uma mudança de rumo — **o web continua sendo o
> Next.js** (`frontend/`); o Expo roda no navegador apenas como *ambiente de teste* (Playwright), não é publicado. As
> decisões em aberto da §9 estão respondidas lá. Para compilar e testar no aparelho, veja [ANDROID.md](./ANDROID.md).
> Versões consultadas em 09/10/2026: Expo SDK 57,
> React Native 0.87, expo-router 57, `react-native-health-connect` 4.1.3, NativeWind 4.2.7 (a 5.x ainda é RC).

## 1. Decisões de arquitetura

| # | Decisão | Por quê | Risco / como validar |
|---|---|---|---|
| 1 | **App universal Expo** (Expo Router): mesma base para Android e web | Você quer usar nos dois; escrever uma vez evita manter duas interfaces | Pacotes só-celular quebram no web → isolar em arquivos `.native.tsx` / `.web.tsx` (Fase 0 valida) |
| 2 | ~~Next.js aposentado depois da paridade~~ **Decisão final: o Next.js fica** como interface web | Você preferiu manter o web como está | O app Expo só é exportado para web dentro dos testes |
| 3 | **Estilo com tema próprio + `StyleSheet`**, sem NativeWind | A v4 estável depende do Tailwind 3 (o web usa Tailwind 4) e a v5 é RC: risco de retrabalho | Reaproveito as mesmas cores (tokens do `globals.css`) |
| 4 | **Gráficos próprios com `react-native-svg`** (anel, rosca, barras+linhas, linhas) | Recharts é DOM e não roda no celular; só há 4 tipos de gráfico, e SVG funciona igual no web | Validar no web com Playwright (Fase 0) |
| 5 | **TanStack Query** para dados, no lugar do `useFetch` | Cache, invalidação após mutações e atualização otimista (checkbox da agenda) funcionam em RN e web | — |
| 6 | **Tipos compartilhados derivados do backend** com `import type` das funções puras (`computeDashboard`, `workoutView`…) | Evita deriva sem gerar OpenAPI; os tipos mudam junto com o backend | Endpoints que devolvem entidades (Food, Activity) ganham tipos escritos à mão; Metro apaga `import type` |
| 7 | **Formulários em rotas** (não `Modal`) | Botão voltar do Android e links no web funcionam | O seletor de alimentos devolve a escolha via contexto |
| 8 | **Autenticação por token Bearer** (um por dispositivo) + HTTPS ou VPN | A API hoje é aberta; o app tira ela do localhost | Ver §4 |
| 9 | **Build por EAS (nuvem) ou Gradle local**, instalação por APK; sem Play Store | Uso pessoal; evita a revisão de dados de saúde da Play | Health Connect **não roda no Expo Go**: precisa de *development build* |

## 2. Estrutura do repositório

```
backend/            NestJS (existente)
frontend/           Next.js (existente; aposentado na Fase 5 se o web do Expo bastar)
packages/shared/    cliente da API, tipos, formatação, helpers puros (totais de itens etc.)
apps/app/           Expo (Android + web)
  app/              rotas (expo-router)
  src/ui/           kit: Card, Bar, Button, Field, Select, DateField, TimeField, Sheet, Toast, ListRow…
  src/charts/       Ring, Donut, BarsLines, MultiLine (react-native-svg)
  src/features/     dashboard, agenda, meals, diets, exercise, foods, body, sync
  src/native/       health-connect, scanner, notifications (só Android)
npm workspaces na raiz
```

Navegação: abas **Hoje · Agenda · Exercícios · Corpo · Mais**; "Mais" abre Refeições, Dietas, Alimentos,
Sincronização e Configurações. No web largo (≥ 900 px) as abas viram menu lateral.

## 3. Paridade de funcionalidades (web → app)

Cada linha só é "pronta" quando tem a tela, o teste e as telas de carregamento/erro/vazio.

| Tela | Funções a portar |
|---|---|
| **Dashboard** | navegação por data; anel de calorias; déficit/superávit "até agora" e "se cumprir o plano"; consumido/meta/restante/TDEE (base + treino); rosca de distribuição; barras de macros e fibra; gráfico dos 7 dias (consumo × TDEE × meta); refeições do dia com status; cartão de exercício; micronutrientes com "sem dados"; aviso de perfil ausente |
| **Agenda** | navegação por data; resumo do dia; marcar feita (otimista) / pular / desfazer; ver itens; ajustar gramas; consumo livre (descrição, horário, preencher com refeição); remover livre |
| **Refeições** | lista com totais; criar/editar/remover; editor de itens com prévia de macros; erro ao remover refeição em uso |
| **Dietas** | lista; ativar; criar/editar/remover; entradas (nome, refeição, horário, dias da semana); totais por dia da semana |
| **Exercícios** | treinos do dia (totais, editar, remover); registrar treino com estimativa ao vivo; catálogo com busca; atividades próprias (criar/editar/remover) |
| **Alimentos** | busca local (TACO + meus) e Open Food Facts; código de barras; detalhe com micros; novo alimento; remover alimento próprio |
| **Corpo** | cartões de energia; previsão semanal (cartões, gráfico, tabela); pesagens (registrar, listar, remover); perfil com modo de gasto |
| **Componentes** | FoodPicker, ItemsEditor, MacroChips, SourceBadge, DateNav, Bar, tema claro/escuro |

### Só no celular (novo)

- **Leitor de código de barras** (câmera): EAN → `/foods/barcode/:code` → adicionar à refeição ou ao diário.
- **Sincronização Health Connect** (§5) e tela de **diagnóstico**.
- **Lembretes de refeição**: notificações locais agendadas a partir da dieta ativa (sem servidor de push).
- **Configurações**: URL do servidor, token, tema, permissões.

## 4. Mudanças no backend (Fase 1)

1. **Auth**: guard global lendo `API_TOKENS` (lista; um token por dispositivo), comparação em tempo constante,
   `GET /api/health` público, limite de taxa (`@nestjs/throttler`), CORS configurável. Nada de senha/usuários: app de
   usuário único.
2. **Import de treinos**: aceitar `exerciseType` do Health Connect e mapear no servidor para o catálogo (tabela testada);
   tipo desconhecido → atividade genérica; aceitar `deletedExternalIds` (o Health Connect informa remoções); devolver o
   que foi criado/atualizado/ignorado.
3. **Peso do relógio/balança**: `POST /body/weights` aceitar `source` e `externalId` (idempotente), para importar
   `WeightRecord`/`BodyFatRecord` sem duplicar.
4. **Implantação**: `Dockerfile` da API e `Caddyfile` (HTTPS + serve o web exportado em `/` e a API em `/api`, mesma
   origem, sem CORS). Alternativa documentada: Tailscale, sem exposição pública.
5. **Tipos**: pequenos `type` exportados das funções puras para o `packages/shared` importar.

Testes: e2e do guard (com/sem token), do mapeamento de tipos e da idempotência do import de peso.

## 5. Sincronização com o Health Connect

**Leitura** (permissões `READ_EXERCISE`, `READ_ACTIVE_CALORIES_BURNED`, `READ_TOTAL_CALORIES_BURNED`, `READ_DISTANCE`,
`READ_HEART_RATE`, `READ_WEIGHT`, `READ_BODY_FAT`, mais `READ_HEALTH_DATA_IN_BACKGROUND` e `READ_HEALTH_DATA_HISTORY`).
Sem a permissão de histórico, só os 30 dias após a concessão ficam visíveis.

**Algoritmo** (função pura, testada com fixtures):

1. Primeira vez: ler sessões de exercício dos últimos 30 dias; depois, só mudanças pelo *token de changes*, guardado
   no aparelho (`expo-secure-store`).
2. Para cada `ExerciseSessionRecord`: agregar calorias ativas, distância e FC média **dentro do intervalo da sessão**
   (as calorias não vêm na sessão).
3. Calorias: usar *ativas* se existirem; se só houver *totais*, subtrair o repouso do intervalo e marcar como
   estimadas; sem nenhuma, deixar o servidor calcular por MET.
4. Montar o lote (`externalId` = id do registro) e enviar a `POST /workouts/import` em partes; reenviar é seguro.
5. Remoções → `deletedExternalIds`. Pesagens → `/body/weights`.

**Execução**: ao abrir o app e no "puxar para atualizar" (confiável) + tarefa periódica em segundo plano
(`expo-background-task`, mínimo ~15 min, o sistema decide quando). Se a confiabilidade for insuficiente no seu
aparelho, a alternativa é um worker Kotlin como módulo Expo.

**Pegadinhas conhecidas**: a One UI (Samsung) mata tarefas em segundo plano: será preciso marcar o app como "Sem
restrições" na bateria. Quais tipos de dado o Samsung Health grava (ativas × totais, FC, distância) e se a composição
corporal passa pelo Health Connect **não está verificado**; por isso existe a tela de **diagnóstico** (lista os
registros brutos dos últimos 7 dias e o que seria enviado). Ela é o primeiro item a testar no aparelho.

## 6. Fases

Tamanhos relativos (P/M/G); não estimo datas.

| Fase | Entrega | Critério de aceite | Verificação |
|---|---|---|---|
| **0. Spike** (P) | Expo SDK 57 em `apps/app`; um gráfico SVG e uma aba rodando no web; `.native/.web`; checagem da API do `react-native-health-connect` | `expo export -p web` renderiza; screenshot do gráfico via Playwright; decisões 1, 3, 4, 6 confirmadas ou revistas | Aqui |
| **1. Backend** (M) | §4 completo, README e `.env.example` | Testes novos verdes; 74+ testes passando; API recusa sem token | Aqui |
| **2. Base do app** (M) | Workspaces, `packages/shared`, tema claro/escuro, navegação, kit de UI, gráficos, tela de login/configurações, React Query | Login com URL+token funciona no web; kit com testes; 360 px de largura sem rolagem horizontal | Aqui (web) |
| **3. Paridade** (G) | Telas na ordem: Dashboard → Agenda → Alimentos/FoodPicker → Refeições → Dietas → Exercícios → Corpo | Cada linha da tabela do §3 marcada; Playwright por tela contra o backend com dados de demonstração comparando os números com a API; capturas em claro/escuro | Aqui (web); no Android por você |
| **4. Android nativo** (M–G) | Health Connect (permissões, sync, segundo plano, diagnóstico), scanner, notificações | Um treino real do Galaxy Watch 5 aparece no app com calorias coerentes; reimportar não duplica; lembrete dispara | **No seu aparelho** (não há Android SDK/emulador aqui) |
| **5. Fechamento** (P–M) | Build de release (APK), CI, documentação, cache offline de leitura (opcional), decisão sobre aposentar o Next.js | App instalável; CI roda testes e exporta o web; Next.js removido ou mantido por decisão sua | Aqui + aparelho |

## 7. Estratégia de testes

- **Lógica pura** (totais, mapeamento do Health Connect, planejador de sincronização, formatação): Jest, com fixtures.
- **Componentes**: `jest-expo` + React Native Testing Library.
- **Telas (web)**: Playwright contra `expo export -p web` + backend com seed. É a verificação que consigo rodar aqui
  e cobre a maior parte da paridade.
- **Android**: roteiro manual no aparelho + (opcional) Maestro. O código nativo será mantido o menor possível e
  escrito sem poder executá-lo aqui; os logs de `expo prebuild`/build que você me enviar fecham o ciclo.

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Não consigo compilar nem rodar o Android daqui | Superfície nativa mínima, diagnóstico em tela, você valida a Fase 4 e me envia logs |
| Samsung Health pode gravar dados diferentes do esperado | Algoritmo com plano B (estimar por MET) e tela de diagnóstico antes de fixar o formato |
| Segundo plano pouco confiável na One UI | Sync ao abrir + instrução de bateria + worker Kotlin se necessário |
| Mudanças de versão no Expo/RN | Fixar SDK 57; atualizar só entre fases |
| Pacote só-celular quebrando o web | Isolamento por plataforma desde a Fase 0 |
| API exposta sem proteção | Fase 1 vem antes de qualquer app falar com o servidor |

## 9. Decisões (respondidas)

1. **Web**: fica no Next.js. O Expo web é só harness de teste.
2. **Acesso ao servidor**: HTTPS com Caddy (`deploy/`). HTTP só em rede local, com `APP_ALLOW_HTTP=1` ao gerar o app.
3. **Build**: Android Studio / Gradle local (`expo prebuild` + `expo run:android`). Sem EAS.
4. **Pacote**: `com.lucasebc.personutri`.
5. **Offline**: registrar sem sinal e sincronizar depois (fila com `Idempotency-Key`, ver `packages/shared/src/outbox`).

## 10. O que foi verificado e o que não foi

- **Verificado aqui**: testes do backend (unitários e e2e), testes do pacote compartilhado, `tsc`, exportação do bundle
  Android (Hermes) e do web, `expo prebuild` (manifesto e permissões) e 27 testes Playwright do app contra a API real,
  incluindo cenários offline.
- **Não verificado (só no seu aparelho)**: tudo o que chama código nativo — permissões e leitura do Health Connect,
  tarefa em segundo plano, notificações, câmera/leitor de código de barras e a compilação Gradle. Também não foram
  testados o Open Food Facts ao vivo nem o deploy Docker/Caddy. O roteiro de teste está em [ANDROID.md](./ANDROID.md).

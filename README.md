# PersoNutri

Planejamento de dieta e acompanhamento diário: cadastre refeições e dietas, acompanhe calorias, macros e
micronutrientes do dia, compare com o gasto calórico estimado a partir dos seus dados corporais (déficit/superávit)
e confronte a **previsão semanal de peso** com o peso medido.

- **Frontend**: Next.js 15 (App Router) + Tailwind 4 + Recharts — `frontend/`
- **Backend**: NestJS 11 + TypeORM + SQLite (arquivo local, sem precisar subir banco) — `backend/`

## Fontes de dados de alimentos

| Fonte | Para quê | Como entra |
|---|---|---|
| **[Open Food Facts](https://world.openfoodfacts.org)** (API gratuita e aberta) | Produtos industrializados vendidos no Brasil, por nome ou **código de barras** | Consulta ao vivo (`/cgi/search.pl` filtrada por `countries=brazil` e `/api/v2/product/{ean}`); cada produto consultado é salvo no banco local como cache |
| **[TACO](https://www.nepa.unicamp.br/taco/) (NEPA/UNICAMP, 4ª ed.)** | Alimentos genéricos brasileiros (arroz, feijão, frutas, carnes…) com **micronutrientes** | 591 alimentos embutidos em `backend/src/foods/data/taco.json` e carregados na primeira execução. Gerado por `backend/scripts/build-taco.mjs` a partir dos CSVs normalizados do repositório [brolesi/taco](https://github.com/brolesi/taco) (MIT) |
| Cadastro manual | O que não está em nenhuma base (receitas, marcas locais) | Tela **Alimentos → Novo alimento** |

Por que as duas: o Open Food Facts é a melhor fonte aberta de produtos de mercado brasileiros (EAN, marca, rótulo),
mas é colaborativa — a qualidade varia e micronutrientes costumam faltar. A TACO é a referência oficial de composição
de alimentos no Brasil, com minerais e vitaminas, mas não tem marcas. Nutrientes que uma base não informa aparecem como
"sem dados" no dashboard (nunca como zero).

> Limites do Open Food Facts (por IP): 10 buscas/min e 15 consultas de produto/min. O backend guarda respostas em
> cache por 10 min e, se a API estiver fora do ar, a busca local continua funcionando e a tela mostra um aviso.

### Cadastro, chave ou token?

Nenhuma integração atual exige conta, chave ou token:

- **Open Food Facts**: leitura é aberta, sem chave nem cadastro. Só exige um `User-Agent` que identifique o app
  (`OFF_USER_AGENT`, ex.: `PersoNutri/0.1 (seu@email.com)`). Conta só é necessária para *escrever* dados na base deles,
  o que este app não faz. Os dados são ODbL: dê atribuição ao Open Food Facts e, se redistribuir uma base derivada, use a
  mesma licença.
- **TACO**: não é uma API; os dados estão embutidos no projeto (cite NEPA/UNICAMP).

## Rodando

Requisitos: Node 20+ (testado com 22).

```bash
npm run install:all

# terminal 1 — API em http://localhost:3001/api
npm run dev:backend

# terminal 2 — app em http://localhost:3000
npm run dev:frontend

# opcional: dados de demonstração (refeições, dieta, perfil, 5 semanas de histórico)
npm run seed:demo
```

Configuração: `backend/.env.example` (variáveis de ambiente da API) e `frontend/.env.example`
(`NEXT_PUBLIC_API_URL`, padrão `http://localhost:3001/api`). O banco fica em `backend/data/personutri.sqlite`.

Testes: `npm test` (45 unitários + 50 e2e HTTP contra SQLite em memória, com o Open Food Facts simulado).

## Segurança e implantação

- A API aceita **tokens Bearer** (`API_TOKENS`, um por dispositivo). Sem tokens ela fica aberta (apenas
  desenvolvimento local) e **se recusa a subir em produção**. O site Next.js pede o token na primeira visita.
- Requisições com `Idempotency-Key` são idempotentes (o app Android usa isso para reenviar a fila offline sem duplicar).
- `POST /api/workouts/import` e `POST /api/body/weights/import` recebem dados do Health Connect (idempotentes).
- **Deploy com HTTPS** (Docker + Caddy, Let's Encrypt automático): veja [`deploy/README.md`](deploy/README.md).

## Como funciona

**Refeições** são combinações reutilizáveis de alimentos (gramas). **Dietas** são a agenda semanal: cada entrada liga
uma refeição a um horário e dias da semana; só uma dieta fica ativa. **Agenda/diário**: ao abrir um dia, as refeições
da dieta ativa viram registros *pendentes* que você marca como **feitas** ou **puladas** (e pode ajustar as
quantidades do que realmente comeu); também dá para registrar **consumo livre**. Só o que está *feito* conta nos totais.

**Exercícios** (tela Exercícios): catálogo com ~50 atividades (valores de MET do Compendium of Physical Activities) e
cadastro de atividades próprias. Calorias de um treino = MET × peso × horas (bruto) e (MET − 1) × peso × horas (ativo,
acima do repouso). Caminhada e corrida usam as equações metabólicas do ACSM (velocidade e inclinação) e ciclismo uma
tabela por velocidade, então "caminhar a 5,5 km/h por 45 min" dá uma estimativa própria para o seu peso. Se um
relógio informar as calorias ativas, esse valor substitui o cálculo.

**Gasto diário e treinos**: o fator de atividade (1,2–1,9) já embute um treino médio, então somar treinos por cima
contaria duas vezes. Por isso o perfil tem dois modos: *fator fixo* (treinos só informativos) e *base do dia a dia +
treinos registrados* (recomendado: gasto = basal × fator sem treino + calorias ativas dos treinos do dia; a meta
acompanha). A previsão de peso usa a média diária de treino de cada semana.

**Metas e balanço** (tela Corpo → perfil e pesagens):
- Metabolismo basal: Mifflin-St Jeor (ou Katch-McArdle, se você informar % de gordura e escolher essa fórmula).
- Gasto diário (TDEE) = basal × fator de atividade (1,2 a 1,9). O peso usado é o da última pesagem até a data.
- Meta calórica = TDEE + (objetivo kg/semana × 7.700 kcal) ÷ 7. Macros: proteína por kg, gordura por % das kcal,
  carboidrato = restante.
- **Balanço do dia** = consumido − TDEE (negativo = déficit). O dashboard mostra o parcial e o "previsto se cumprir
  o resto do plano".

**Previsão semanal de peso** (`backend/src/forecast/forecast.ts`): o peso previsto de uma semana parte da **média
medida da semana anterior** e soma o balanço calórico da semana (ingestão registrada − TDEE, ÷ 7.700 kcal/kg). O TDEE
é recalculado com o peso de partida. Semanas sem registro de consumo usam a meta do plano e são sinalizadas; o
consumo parcial do dia corrente não entra na média. Também mostra a trajetória da meta, uma projeção de 4 semanas e
um **gasto calibrado** (o gasto diário implícito no que você comeu e no peso que de fato variou — útil para ajustar o
fator de atividade).

Valores de referência de micronutrientes: RDC 269/2005 (ANVISA) e OMS, para adultos. São genéricos e **não substituem
orientação de nutricionista**.

## Estrutura

```
backend/src
  foods/      alimentos (TACO + Open Food Facts + manual), busca, cache
  meals/      refeições        diets/     dietas e agenda semanal
  diary/      agenda do dia    body/      perfil, pesagens, BMR/TDEE/metas
  dashboard/  totais do dia    forecast/  previsão semanal de peso
frontend/src/app   site Next.js: dashboard, agenda, refeicoes, dietas, alimentos, exercicios, corpo
apps/app/src       app Android (Expo): telas, fila offline, módulos nativos (src/native)
packages/shared    cliente da API, tipos, cálculo e fila offline compartilhados
deploy/            Docker + Caddy (HTTPS)
docs/mobile        plano e guia do app Android
```

## App Android (React Native / Expo)

`apps/app` é um app Android completo, com as mesmas telas do site (Hoje, Agenda, Refeições, Dietas, Alimentos,
Exercícios, Corpo), **registro sem sinal com sincronização depois**, leitor de código de barras, lembretes de refeição e
a sincronização de treinos/peso com o **Health Connect** (Galaxy Watch 5 → Samsung Health → Health Connect → servidor).
O site continua sendo o Next.js de `frontend/`.

- Compilar, instalar e roteiro de teste no aparelho: [docs/mobile/ANDROID.md](docs/mobile/ANDROID.md).
- Plano e decisões: [docs/mobile/PLANO.md](docs/mobile/PLANO.md).
- `packages/shared`: cliente da API, formatação, cálculo de calorias, fila offline e planejador da sincronização —
  código puro compartilhado e testado (`npm run app:test`).

**Por que Health Connect?** O Google Fit (REST) não aceita novos desenvolvedores desde maio de 2024. O Health Connect
só existe *no aparelho*, por isso o app lê lá e envia para `POST /api/workouts/import` (idempotente: reenviar
atualiza, não duplica) e `POST /api/body/weights/import`. Também dá para importar manualmente por essa API.

## Testes e CI

```bash
npm test               # backend: unitários + e2e
npm run app:typecheck  # app + shared
npm run app:test       # shared (Jest)
npm run app:e2e        # builda backend + web do app e roda o Playwright contra a API real
```

O GitHub Actions (`.github/workflows/ci.yml`) roda tudo isso, além da exportação do bundle Android e do build do site.

## Limitações conhecidas

- App de **usuário único**, com autenticação apenas por token Bearer (`API_TOKENS`). Sirva sempre por HTTPS
  (`deploy/`) e considere trocar o SQLite por um banco servidor se for crescer.
- O código nativo do app Android (Health Connect, segundo plano, notificações, câmera) não pôde ser executado onde foi
  escrito; foi validado por tipos, bundle e `prebuild`. O Open Food Facts ao vivo e o deploy Docker/Caddy também não
  foram testados ponta a ponta.
- O esquema do banco é sincronizado automaticamente (`synchronize: true`); para produção, use migrations.
- Quantidades em gramas (ou ml); ainda não há medidas caseiras ("1 colher", "1 fatia") — só a porção do rótulo
  quando o Open Food Facts informa.
- TACO não traz açúcares nem gordura saturada; para produtos do Open Food Facts esses campos aparecem quando existem.

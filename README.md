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

> Limites do Open Food Facts: ~10 buscas/min e ~100 consultas de produto/min por IP. O backend guarda respostas em
> cache por 10 min e, se a API estiver fora do ar, a busca local continua funcionando e a tela mostra um aviso.
> Defina `OFF_USER_AGENT` com um contato seu (a API pede identificação do app).

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

Testes: `npm test` (28 unitários + 23 e2e HTTP contra SQLite em memória, com o Open Food Facts simulado).

## Como funciona

**Refeições** são combinações reutilizáveis de alimentos (gramas). **Dietas** são a agenda semanal: cada entrada liga
uma refeição a um horário e dias da semana; só uma dieta fica ativa. **Agenda/diário**: ao abrir um dia, as refeições
da dieta ativa viram registros *pendentes* que você marca como **feitas** ou **puladas** (e pode ajustar as
quantidades do que realmente comeu); também dá para registrar **consumo livre**. Só o que está *feito* conta nos totais.

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
frontend/src/app   dashboard, agenda, refeicoes, dietas, alimentos, corpo
```

## Limitações conhecidas

- App de **usuário único, sem autenticação** — pensado para uso pessoal/local. Antes de expor na internet, adicione
  autenticação e troque o SQLite por um banco servidor.
- O esquema do banco é sincronizado automaticamente (`synchronize: true`); para produção, use migrations.
- Quantidades em gramas (ou ml); ainda não há medidas caseiras ("1 colher", "1 fatia") — só a porção do rótulo
  quando o Open Food Facts informa.
- TACO não traz açúcares nem gordura saturada; para produtos do Open Food Facts esses campos aparecem quando existem.

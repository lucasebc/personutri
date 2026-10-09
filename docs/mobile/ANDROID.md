# App Android: compilar, instalar e testar

O app (`apps/app`) é Expo/React Native. Como usa o Health Connect, **não roda no Expo Go**: é preciso gerar um
*development build* (ou um APK de release) com o Android Studio.

## Pré-requisitos

- Node 22+, JDK 17 e o Android Studio (SDK Platform 36 e Build-Tools instalados).
- Um celular Android 9+ (minSdk 26) com depuração USB, ou um emulador. **Health Connect e Samsung Health só funcionam
  de verdade num aparelho real com o relógio pareado.**
- O servidor (`backend`) rodando com `API_TOKENS` definido. Para HTTPS em produção veja `deploy/README.md`.

## Compilar e rodar

```bash
npm install                 # na raiz: instala os workspaces (app + shared)
npm --prefix backend install
cd apps/app
npx expo prebuild --platform android      # gera a pasta android/ (ignorada pelo git)
npx expo run:android                       # compila com Gradle e instala no aparelho conectado
```

- Servidor em **rede local sem HTTPS** (teste): gere o app com `APP_ALLOW_HTTP=1 npx expo prebuild --platform android --clean`
  — isso liga `usesCleartextTraffic`. Em produção use HTTPS e **não** defina essa variável.
- Para um APK instalável sem o Metro rodando: `cd android && ./gradlew assembleRelease`
  (o APK fica em `android/app/build/outputs/apk/release/`). Sem keystore próprio ele sai assinado com a chave de debug,
  o que serve para uso pessoal.
- Depois de mudar plugins ou permissões em `app.config.ts`, rode `prebuild --clean`.

## Primeiro uso

1. Abra o app, informe a URL do servidor (`https://…/api` ou `http://IP:3001/api`) e o token de `API_TOKENS`.
2. **Mais → Sincronização**: conceda as permissões do Health Connect e toque em **Sincronizar agora**.
3. Ative a **sincronização em segundo plano** e deixe o app como **"Sem restrições"** em Bateria (a One UI mata tarefas
   em segundo plano de apps restritos; a tela tem um atalho para as configurações).

## Roteiro de teste no aparelho

Marque o que funcionou e me mande o que falhar (a tela **Sincronização → Diagnóstico → Compartilhar** gera um relatório
com os registros brutos dos últimos 7 dias).

- [ ] Login com URL e token; token errado é recusado.
- [ ] Hoje / Agenda / Exercícios / Corpo / Mais abrem com os mesmos números do site.
- [ ] Modo avião: marcar uma refeição, registrar consumo livre, treino e peso → aparecem como "a enviar" e, ao voltar o
      sinal, sincronizam sem duplicar (**Mais → Pendências**).
- [ ] Leitor de código de barras (alimentos → câmera) encontra um produto brasileiro.
- [ ] Health Connect: o pedido de permissões aparece e os tipos concedidos ficam marcados.
- [ ] Um treino real do Galaxy Watch 5 (Samsung Health → Health Connect) aparece em Exercícios, com calorias coerentes
      com as do relógio.
- [ ] Sincronizar de novo **não duplica** o treino; apagar o treino no app não o traz de volta.
- [ ] Pesagem feita no Samsung Health chega em Corpo (se o Samsung Health a gravar no Health Connect).
- [ ] Sincronização em segundo plano: faça um treino, não abra o app e confira depois de ~1 h.
- [ ] Lembretes de refeição (**Configurações**): a notificação dispara no horário da dieta ativa.
- [ ] Tema claro/escuro e rotação de tela.

## Pontos de atenção

- Samsung Health pode não gravar tudo no Health Connect (calorias ativas × totais, FC, distância). O app tenta
  `ActiveCaloriesBurned`, depois `TotalCaloriesBurned`, e cai para a estimativa por MET quando não há dado.
- Histórico além de 30 dias exige a permissão `READ_HEALTH_DATA_HISTORY`; leitura em segundo plano exige
  `READ_HEALTH_DATA_IN_BACKGROUND` (ambas declaradas, mas a disponibilidade depende da versão do Health Connect).
- O código nativo foi escrito e checado (tipos, bundle Hermes, `prebuild`) sem emulador: espere ajustes na primeira
  execução real.

# Implantação com HTTPS

Requisitos: um servidor com Docker + Docker Compose, um domínio apontando para ele e as portas 80/443 liberadas
(o Caddy obtém e renova o certificado Let's Encrypt sozinho).

```bash
cd deploy
cp .env.example .env        # edite SITE_ADDRESS e gere API_TOKENS:  openssl rand -hex 24
docker compose up -d --build
```

- O site (Next.js exportado) e a API ficam no mesmo endereço: `https://SITE_ADDRESS/` e `https://SITE_ADDRESS/api`.
- Ao abrir o site pela primeira vez ele pede o token. No app Android, informe `https://SITE_ADDRESS` e o token.
- Cada dispositivo pode ter o seu token: `API_TOKENS=tokenCelular,tokenNotebook`. Para revogar um, remova-o do `.env` e
  rode `docker compose up -d`.
- A API recusa subir em produção sem `API_TOKENS`.
- Dados: volume `api-data` (SQLite em `/data/personutri.sqlite`). Backup:
  `docker compose cp api:/data/personutri.sqlite ./backup-$(date +%F).sqlite`
  (o arquivo pode estar em escrita; para um backup rigorosamente consistente pare a API antes: `docker compose stop api`).
- Atualizar: `git pull && docker compose up -d --build`.

> Estes arquivos não foram testados com um daemon Docker no ambiente de desenvolvimento (só a sintaxe do compose foi
> validada). Se o build falhar, envie o log.

## Sem domínio público

O app Android exige HTTPS por padrão. Para testar na rede local, gere um build de desenvolvimento com
`APP_ALLOW_HTTP=1` (libera tráfego `http://` só nesse build) e aponte para o IP do servidor. Para uso diário, use o
domínio com HTTPS acima.

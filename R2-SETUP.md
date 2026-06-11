# R2-SETUP.md — Configuração do Cloudflare R2 (Catálogo)

Guia para configurar o storage de imagens dos produtos (e, no futuro, modelos 3D `.glb`) no Cloudflare R2.
Segue o modelo de segurança da Wave C1.5 do [CATALOG-PLAN.md](CATALOG-PLAN.md): **o navegador nunca recebe credenciais**; o upload acontece via presigned URL gerada no servidor.

> Plano gratuito do R2: 10 GB de armazenamento + 1 milhão de Class A ops/mês. Suficiente para o catálogo.

---

## Passo 1 — Criar o bucket

1. Painel Cloudflare → **R2** → **Create bucket**
2. Nome: ex. `embras-produtos` (este valor vai em `R2_BUCKET`)
3. Location: **Automatic**
4. Create bucket

> ⚠️ **Não** habilite escrita pública. A escrita acontece só via presigned PUT (servidor). Deixe o bucket privado para escrita.

---

## Passo 2 — Pegar o Account ID

- Na página de visão geral do R2, copie o **Account ID** (lado direito).
- Vai em `R2_ACCOUNT_ID`.
- O endpoint S3 do código é derivado dele: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

---

## Passo 3 — Criar API Token (privilégio mínimo)

1. R2 → **Manage R2 API Tokens** → **Create API Token**
2. **Permissions:** `Object Read & Write` (NÃO use Admin)
3. **Specify bucket(s):** selecione **apenas** `embras-produtos` (não "all buckets")
4. **TTL:** deixe sem expiração ou defina rotação conforme política
5. **Create API Token**
6. A tela mostra **uma única vez**:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
   - (ignore o "jurisdiction-specific endpoint" — o código usa o endpoint da conta)

> 🔒 Boas práticas já aplicadas pelo design: token escopado a **1 bucket**, **read+write** apenas (sem admin), credenciais **só no servidor**. Rotacione o token periodicamente.

---

## Passo 4 — Habilitar leitura pública (servir as imagens)

As imagens precisam ser legíveis por GET público. Escolha **uma** opção:

### Opção A — Domínio customizado (recomendado p/ produção)
1. Bucket → **Settings** → **Public access** → **Custom Domains** → **Connect Domain**
2. Informe um subdomínio gerenciado no Cloudflare, ex.: `cdn.embras.com.br`
3. O Cloudflare cria o registro DNS e o TLS automaticamente
4. `R2_PUBLIC_BASE_URL=https://cdn.embras.com.br`

### Opção B — Subdomínio r2.dev (rápido, para testes)
1. Bucket → **Settings** → **Public access** → **R2.dev subdomain** → **Allow Access**
2. Copie a URL gerada (ex.: `https://pub-xxxxxxxx.r2.dev`)
3. `R2_PUBLIC_BASE_URL=https://pub-xxxxxxxx.r2.dev`

> ⚠️ O `r2.dev` é **rate-limited** e não recomendado para produção — use o domínio customizado quando for ao ar.
> Habilitar leitura pública libera **somente GET**. A escrita continua exigindo o presigned PUT.

---

## Passo 5 — Configurar CORS (obrigatório para o upload do navegador)

O PUT presigned parte do browser, então o bucket precisa permitir a origem do site.

1. Bucket → **Settings** → **CORS Policy** → **Add CORS policy**
2. Cole (ajuste o domínio de produção):

```json
[
  {
    "AllowedOrigins": [
      "https://embras.com.br",
      "https://www.embras.com.br",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

> Mantenha `AllowedOrigins` restrito às origens reais (produção + `localhost:3000` para dev). **Nunca** use `"*"`.
> `AllowedHeaders` inclui `content-type` porque a assinatura fixa esse header no PUT.

---

## Passo 6 — Preencher as variáveis de ambiente

No `.env.local` (dev) e nas Environment Variables da Vercel (produção + preview):

```env
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET=embras-produtos
R2_PUBLIC_BASE_URL=https://cdn.embras.com.br
```

> 🔒 As 3 primeiras são **secretas** — **nunca** com prefixo `NEXT_PUBLIC_`. O código (`src/lib/storage/r2-client.ts`) usa `import 'server-only'`, então o build falha se alguém tentar importá-las no cliente.
> Na Vercel, marque-as para **Production** e **Preview**. Reinicie o dev server após editar o `.env.local`.

---

## Passo 7 — Verificar

1. Reinicie `npm run dev`.
2. Faça login no admin e tente um upload de imagem de produto (disponível a partir da Wave C4; antes disso dá para testar o componente isolado).
3. Sucesso esperado: a imagem some do seletor e aparece o preview vindo de `R2_PUBLIC_BASE_URL/products/<uuid>.<ext>`.

### Se falhar
| Sintoma | Causa provável |
|---------|----------------|
| `CORS error` no console do navegador | `AllowedOrigins` não inclui a origem atual (ex.: faltou `localhost:3000`) |
| `SignatureDoesNotMatch` no PUT | relógio do servidor fora de sincronia, ou header `content-type` divergente do assinado |
| `403 AccessDenied` | token sem permissão de escrita ou escopado para outro bucket |
| Preview quebrado (imagem não carrega) | leitura pública não habilitada (Passo 4) ou `R2_PUBLIC_BASE_URL` errado |
| App lança "Missing env: R2_…" | variável ausente — confira o Passo 6 e reinicie o server |

---

## Mapa: variável → onde obter

| Variável | Origem no painel Cloudflare |
|----------|------------------------------|
| `R2_ACCOUNT_ID` | R2 → visão geral → Account ID |
| `R2_ACCESS_KEY_ID` | R2 → API Tokens → Create (mostrado 1x) |
| `R2_SECRET_ACCESS_KEY` | R2 → API Tokens → Create (mostrado 1x) |
| `R2_BUCKET` | Nome escolhido no Passo 1 |
| `R2_PUBLIC_BASE_URL` | Domínio customizado ou URL r2.dev (Passo 4) |

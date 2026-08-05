# Estante

Gerenciador da biblioteca pessoal de 600+ livros físicos.

- **Frontend:** React + Vite
- **Hospedagem:** GitHub Pages
- **Banco de dados:** Firebase (Firestore + Auth)

## Rodar localmente

```bash
cp .env.example .env   # preencha a chave do Google Books e o Firebase
npm install
npm run dev
```

Sem chave do Google Books no `.env`, a busca usa o OpenLibrary como fallback
(pode ser lenta). Com a chave, o Google Books é a fonte primária.

## Firebase (Firestore + Auth)

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com) (plano Spark).
2. **Authentication → Sign-in method → Email/Senha** → habilite.
3. **Firestore Database → Criar banco** → modo produção.
4. **Configurações do projeto → Seus apps → Web** → copie as chaves para o `.env`.
5. Publique as regras de segurança (`firestore.rules`). Com a Firebase CLI:

   ```bash
   npm i -g firebase-tools
   firebase login
   firebase init firestore   # use firestore.rules existente
   firebase deploy --only firestore
   ```

   **Importante:** em `firestore.rules`, troque `SEU_EMAIL@exemplo.com` pelo
   seu e-mail. As regras garantem que a estante é pública para leitura, mas só
   o admin (seu e-mail) pode adicionar/editar/remover livros.

6. **Authentication → Users → Adicionar usuário** e crie a conta do admin com
   o mesmo e-mail usado nas regras. O cadastro público foi removido: visitantes
   veem o catálogo, e só o admin entra.

7. Preencha `VITE_ADMIN_EMAIL` no `.env` com o mesmo e-mail (usado só para
   mostrar/esconder os controles de edição no frontend — a segurança fica nas
   regras).

## Deploy

O workflow `.github/workflows/deploy.yml` publica em GitHub Pages a cada push.
Como as variáveis `VITE_*` são embutidas no bundle em tempo de build, configure
os mesmos valores de `.env` como **Actions secrets/variables** do repositório
(Settings > Secrets and variables > Actions) antes do primeiro deploy.

Habilite GitHub Pages em **Settings > Pages** com source `GitHub Actions`.

## Domínio próprio

O site é servido em `estante.willy.dev.br` (raiz do domínio). Para isso o CI
builda com `VITE_BASE='/'` e o arquivo `public/CNAME` (contendo o subdomínio)
é incluído no deploy. No DNS, crie um CNAME do subdomínio
`estante.willy.dev.br` apontando para `willycornelissen.github.io`; no
**Settings > Pages**, cadastre o domínio e marque *Enforce HTTPS*.

## Estrutura

- `src/lib/metadata.js` — busca de metadados (Google Books → OpenLibrary)
- `src/lib/firebase.js` — inicialização do Firebase (opcional até configurar `.env`)
- `src/lib/auth.js` — autenticação e-mail/senha
- `src/lib/books.js` — CRUD de livros no Firestore
- `src/App.jsx` — busca, login e "Minha estante"
- `firestore.rules` — regras de segurança do banco

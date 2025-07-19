# Guia de Deploy - Pepper Heads CRM

Este guia fornece instruções detalhadas para fazer deploy do Pepper Heads CRM em diferentes ambientes e plataformas.

## 🚀 Visão Geral

O Pepper Heads CRM é uma aplicação React que pode ser deployada em qualquer provedor de hospedagem estática. O backend é gerenciado pelo Supabase, eliminando a necessidade de servidor próprio.

## 🏗️ Arquitetura de Deploy

```
Frontend (React/Vite) → CDN/Static Hosting
         ↓
    Supabase (Backend)
         ↓
    PostgreSQL (Database)
```

## 📋 Pré-requisitos

### Ambiente Local
- Node.js 18+
- npm ou yarn
- Git

### Serviços Externos
- Conta no Supabase
- Conta no provedor de hospedagem (Netlify, Vercel, etc.)

## 🔧 Configuração do Supabase

### 1. Criar Projeto no Supabase

1. Acesse [Supabase](https://supabase.com)
2. Clique em "New Project"
3. Escolha organização e nome do projeto
4. Defina senha do banco de dados
5. Selecione região (preferencialmente próxima aos usuários)

### 2. Configurar Banco de Dados

#### Executar Migrações
```sql
-- Execute cada arquivo em /supabase/migrations/ na ordem:

-- 1. peaceful_delta.sql
-- 2. fancy_moon.sql  
-- 3. restless_river.sql
-- 4. square_mode.sql
-- 5. frosty_summit.sql
```

#### Verificar Estrutura
```sql
-- Verificar se todas as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Resultado esperado:
-- categorias
-- cursos  
-- professores
-- salas
-- alunos
-- turmas
-- turma_professores
-- aluno_curso_interests
```

### 3. Configurar Autenticação

1. Vá para Authentication → Settings
2. Configure:
   - **Site URL**: URL do seu domínio em produção
   - **Redirect URLs**: Adicione URLs de callback
   - **Email confirmations**: Desabilitado (conforme projeto)

### 4. Configurar RLS (Row Level Security)

Verifique se todas as políticas estão ativas:
```sql
-- Verificar RLS habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Verificar políticas
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 5. Obter Credenciais

1. Vá para Settings → API
2. Copie:
   - **Project URL**
   - **anon/public key**

## 🌐 Deploy em Diferentes Plataformas

### Netlify (Recomendado)

#### Via Git (Automático)
1. **Conectar Repositório**
   ```bash
   # Push para GitHub/GitLab
   git push origin main
   ```

2. **Configurar no Netlify**
   - Acesse [Netlify](https://netlify.com)
   - "New site from Git"
   - Conecte seu repositório
   - Configure build settings:
     ```
     Build command: npm run build
     Publish directory: dist
     ```

3. **Variáveis de Ambiente**
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anonima
   ```

#### Via CLI
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Build local
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### Vercel

#### Via Git
1. **Conectar Repositório**
   - Acesse [Vercel](https://vercel.com)
   - "New Project"
   - Import do GitHub/GitLab

2. **Configuração Automática**
   - Vercel detecta Vite automaticamente
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Variáveis de Ambiente**
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anonima
   ```

#### Via CLI
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### GitHub Pages

#### Configuração
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
      env:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    
    - name: Deploy
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### AWS S3 + CloudFront

#### 1. Criar Bucket S3
```bash
# AWS CLI
aws s3 mb s3://pepper-heads-crm
aws s3 website s3://pepper-heads-crm --index-document index.html
```

#### 2. Build e Upload
```bash
# Build
npm run build

# Upload
aws s3 sync dist/ s3://pepper-heads-crm --delete
```

#### 3. Configurar CloudFront
```json
{
  "Origins": [{
    "DomainName": "pepper-heads-crm.s3-website-us-east-1.amazonaws.com",
    "Id": "S3-pepper-heads-crm"
  }],
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-pepper-heads-crm",
    "ViewerProtocolPolicy": "redirect-to-https"
  },
  "CustomErrorResponses": [{
    "ErrorCode": 404,
    "ResponseCode": 200,
    "ResponsePagePath": "/index.html"
  }]
}
```

## 🔒 Configurações de Segurança

### Headers de Segurança

#### Netlify (_headers)
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co;
```

#### Vercel (vercel.json)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options", 
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Redirects para SPA

#### Netlify (_redirects)
```
/*    /index.html   200
```

#### Vercel (vercel.json)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## 🌍 Configuração de Domínio

### DNS Configuration
```
# Netlify
CNAME   www    your-site.netlify.app
A       @      75.2.60.5

# Vercel  
CNAME   www    cname.vercel-dns.com
A       @      76.76.19.61
```

### SSL/TLS
- **Netlify**: SSL automático via Let's Encrypt
- **Vercel**: SSL automático
- **CloudFlare**: Proxy + SSL gratuito

## 📊 Monitoramento

### Analytics

#### Google Analytics
```html
<!-- index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

#### Plausible (Privacy-friendly)
```html
<script defer data-domain="seudominio.com" src="https://plausible.io/js/plausible.js"></script>
```

### Error Tracking

#### Sentry
```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE,
});
```

### Performance Monitoring

#### Web Vitals
```typescript
// src/utils/analytics.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Enviar para seu serviço de analytics
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - run: npm ci
    - run: npm run lint
    - run: npm run test
    - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - run: npm ci
    - run: npm run build
      env:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    
    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v1.2
      with:
        publish-dir: './dist'
        production-branch: main
        github-token: ${{ secrets.GITHUB_TOKEN }}
        deploy-message: "Deploy from GitHub Actions"
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Erro 404 em Rotas
**Problema**: Páginas retornam 404 ao acessar diretamente
**Solução**: Configurar redirects para SPA
```
# _redirects (Netlify)
/*    /index.html   200
```

#### 2. Variáveis de Ambiente Não Carregam
**Problema**: `import.meta.env.VITE_*` retorna undefined
**Solução**: 
- Verificar prefixo `VITE_`
- Reiniciar servidor de desenvolvimento
- Verificar arquivo `.env`

#### 3. Erro de CORS
**Problema**: Requests para Supabase bloqueados
**Solução**: Configurar domínio no Supabase
```
Authentication → Settings → Site URL
```

#### 4. Build Falha
**Problema**: `npm run build` falha
**Solução**:
```bash
# Limpar cache
rm -rf node_modules package-lock.json
npm install

# Verificar TypeScript
npm run lint
```

### Logs e Debug

#### Netlify
```bash
# Ver logs de build
netlify logs

# Debug local
netlify dev
```

#### Vercel
```bash
# Ver logs
vercel logs

# Debug local  
vercel dev
```

### Performance Issues

#### Bundle Size
```bash
# Analisar bundle
npm run build
npx vite-bundle-analyzer dist
```

#### Lighthouse Audit
```bash
# Instalar CLI
npm install -g lighthouse

# Executar audit
lighthouse https://seusite.com --output html --output-path ./report.html
```

## 📈 Otimizações

### Build Optimizations
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react', 'react-hot-toast']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

### Image Optimization
```typescript
// Usar WebP quando possível
<img 
  src="image.webp" 
  alt="Description"
  loading="lazy"
  width="300"
  height="200"
/>
```

### Caching Strategy
```
# _headers (Netlify)
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

## 🔄 Rollback Strategy

### Netlify
```bash
# Listar deploys
netlify sites:list

# Rollback para deploy anterior
netlify rollback
```

### Vercel
```bash
# Listar deployments
vercel ls

# Promover deployment específico
vercel promote <deployment-url>
```

### Manual Rollback
```bash
# Git rollback
git revert <commit-hash>
git push origin main

# Ou reset para commit anterior
git reset --hard <commit-hash>
git push --force origin main
```

---

Este guia cobre todos os aspectos necessários para fazer deploy do Pepper Heads CRM com segurança e eficiência. Para dúvidas específicas, consulte a documentação da plataforma escolhida ou abra uma issue no repositório.
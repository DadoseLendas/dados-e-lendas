<div align="center">
  <img src="public/logo.png" alt="Dados e Lendas Logo" width="120" />
  <h1>Dados & Lendas</h1>
  <p>
    <strong>A plataforma definitiva para Mestres e Jogadores de RPG.</strong>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Supabase-SSR-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  </p>
</div>

<br />

## ⚔️ Sobre o Projeto

**Dados & Lendas** é uma aplicação web moderna desenvolvida para facilitar a gestão de mesas de RPG (com foco em D&D 5e). O projeto combina uma experiência de usuário imersiva (Dark Fantasy UI) com uma arquitetura robusta de autenticação e banco de dados em tempo real.


## ✨ Funcionalidades Principais

- **Autenticação Híbrida:** Login via Google (OAuth) e Email/Senha.
- **Onboarding Inteligente:**
  - Usuários que logam via Google são redirecionados para completar o cadastro (escolha de Nickname único).
  - Validação rigorosa de Nickname (sem espaços/caracteres especiais) e Senhas fortes via Regex.
  - Feedbacks visuais de carregamento e erro.
- **Arquitetura de Banco de Dados:**
  - Separação entre dados de Auth e Perfil Público.
  - Triggers automáticos no PostgreSQL para gestão de usuários.
  - Estrutura pronta para Campanhas (Mestre/Jogador) com RLS (Row Level Security).

## 🛠️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend as a Service:** [Supabase](https://supabase.com/) (Auth, Database, Storage)
- **Gerenciamento de Estado/Auth:** `@supabase/ssr` (Cookies & Session Management)
- **Fontes:** Playfair Display (Títulos) & Inter (Corpo).

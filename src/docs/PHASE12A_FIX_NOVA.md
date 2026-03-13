# PHASE 12A — Correção da rota Nova Vistoria

Correções aplicadas:
- reforço no roteamento SPA para `#/nova`
- ativação direta e segura da view `#viewNova`
- fallback quando a hash já está ativa
- inicialização após `DOMContentLoaded`
- prevenção de travamentos por listeners ausentes

Objetivo:
Garantir que a tela **Nova Vistoria** nunca abra vazia no GitHub Pages ou no Vercel.

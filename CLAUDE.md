# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: a platform for playing games online and competing for the highest score. The README says the project follows Spec Driven Design (`/spec` and `/spec-impl` workflow), using skills installed via `npx skills@latest add Klerith/fernando-skills`. The codebase is currently a fresh Create Next App scaffold (single commit, no game or scoring code yet).

## Commands

- `npm run dev` — dev server (also regenerates the AGENTS.md block)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, `eslint-config-next`)
- No test runner is configured.

## Architecture

- Next.js 16.3 App Router (`app/`), React 19, TypeScript, Tailwind CSS v4 (via `@tailwindcss/postcss`; styles in `app/globals.css`).
- Path alias `@/*` maps to the repo root.
- `app/layout.tsx` uses the globally-typed `LayoutProps<"/">` helper (no import needed) and loads Geist fonts via `next/font/google`.
- Next.js docs matching the installed version are in `node_modules/next/dist/docs/` — consult them before writing code, per AGENTS.md.

##Skills
Usa siempre /frontend-design para disenhar la interfaz de usuario.
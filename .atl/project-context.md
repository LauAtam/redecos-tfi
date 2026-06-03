# SDD Project Context: redecos-tfi

**Executive Summary**: Initialized SDD context for a NestJS + Angular/Ionic monorepo with Supabase integration.

## Stack & Conventions
- **Backend Framework**: NestJS (v11) with TypeScript (v5.7)
- **Frontend Framework**: Angular (v20) + Ionic (v8) + Capacitor (v8)
- **Database/Integration**: Supabase (Project Ref: `tddzhhtzveqbatmqtjon`)
- **Architecture**: Monorepo split (`/backend` and `/frontend`)
- **Persistence Mode**: Engram (Local fallback in `.atl/` files enabled due to MCP unavailability)

## Tooling
- **Backend Test Runner**: Jest (v30)
- **Frontend Test Runner**: Karma + Jasmine
- **Linter**: ESLint (v9) in backend and frontend (angular-eslint)
- **Formatter**: Prettier (backend) / EditorConfig (frontend)
- **Strict TDD**: Enabled (`strict_tdd: true` - auto-detected test runners in both projects)

## Persistence
- **Registry**: `.atl/skill-registry.md`
- **Capabilities**: `.atl/testing-capabilities.md`

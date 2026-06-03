# Testing Capabilities

## Backend (NestJS)

| Category | Tool | Command / Configuration |
|----------|------|-------------------------|
| Test Runner | Jest | `npm run test` (from /backend) |
| Watch Mode | Jest | `npm run test:watch` (from /backend) |
| E2E Testing | Jest / supertest | `npm run test:e2e` (from /backend) |
| Coverage | Jest | `npm run test:cov` (from /backend) |
| Linter | ESLint | `npm run lint` (from /backend) |
| Formatter | Prettier | `npm run format` (from /backend) |
| Type Checker | TypeScript | `npx tsc` (from /backend) |

## Frontend (Angular/Ionic)

| Category | Tool | Command / Configuration |
|----------|------|-------------------------|
| Test Runner | Karma / Jasmine | `npm run test` or `ng test` (from /frontend) |
| Linter | ESLint / angular-eslint | `npm run lint` or `ng lint` (from /frontend) |
| Type Checker | TypeScript / Angular CLI | `ng build` (from /frontend) |

**Strict TDD Mode**: Active (`strict_tdd: true`)

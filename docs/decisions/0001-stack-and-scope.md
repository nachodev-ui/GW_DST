# ADR 0001 — Monorepo y límites del scaffolding

Fecha: 2026-10-17. Estado: aceptado.

Decisión: npm workspaces con apps/mobile, Expo SDK 58 estable y Expo Router. Versiones
compatibles tomadas del registro oficial y bundledNativeModules de expo 58.0.14;
dependencias directas fijadas y lockfile. TypeScript strict y theme propio.

Motivo: una app con ambos roles y espacio para un admin web futuro, sin duplicar
infraestructura ni diseñar pantallas antes de definir flujos.

Consecuencia: las features son directorios reservados. La ruta inicial es vacía;
no hay auth, matching, tracking, notificaciones o UI final implementados. Las APIs
nativas se configuran sin invocarlas. No hay librería de UI genérica.

Fuente: [Expo SDK 58](https://expo.dev/changelog/sdk-58).

# ADR 0022 — Regresiones offline y SQL separado

Fecha: 2026-10-22. Estado: aceptada.

## Decisión

Conservar las assertions existentes y ejecutarlas como archivos independientes con
`node --test`, más la suite administrativa de PowerShell 7. Un loader común transpila
TypeScript con mapas de origen y permite mocks explícitos de los límites externos.
El preload rechaza HTTP fetch y conexiones TCP accidentales; no se carga `.env`.
No se usa un runtime nativo ni se renderizan pantallas.

C8 mide siete módulos críticos mediante allowlist, incluyendo archivos no ejecutados
en el denominador. Se exige al menos 85 % en líneas/statements/funciones y 75 % en
ramas, agregados sobre esa lista. La cifra no representa cobertura de toda la app,
Postgres ni comportamiento real de dispositivos.

CI en Linux/Windows ejecuta tipos, lint, formato y cobertura sin secretos cloud. Las
acciones oficiales se fijan por commit; solo se concede lectura del repositorio.
La puerta de formato requiere normalizar el baseline de archivos ya existentes.

## SQL y cloud

`supabase/tests/suites.json` clasifica cada SQL exactamente una vez. Solo `current`
se ejecuta; nueve suites históricas quedan excluidas explícitamente. Las pruebas
de avance y workspace se adaptan a compras por distribuidora y cobertura del negocio
de ADR 0021. Ninguna prueba secuencial demuestra carreras entre conexiones: DT-03
conserva ese alcance.

Se crea `Gasway Test` en la organización Free confirmada por el usuario, con esquema
desde migraciones versionadas y sin copiar datos del proyecto de la app. El runner
acepta únicamente su ref registrada, rechaza la ref de la app y exige un marcador
privado en el servidor. Cada suite ejecuta dentro de una transacción con rollback
y timeout. No hay reset, servicios pagados ni Docker.

El workflow cloud es manual, desde main, con environment `gasway-test` y credenciales
privadas de ese entorno; nunca recibe secretos en PRs. Las migraciones del entorno
se preparan por separado, con destino explícito. No se publica automáticamente ni
se modifica la conexión del móvil.

## Corrección del transporte CI — 2026-10-22

Un checkout limpio de Actions no tiene la caché de enlace/pooler que tenía la
validación local y falló por IPv6 antes de ejecutar SQL. Con PAT explícito, el runner
usa Management API por HTTPS y envía cada batch con begin/rollback en una petición.
CI falla si falta PAT; no recurre al CLI. El desarrollo local sin PAT conserva CLI.

El endpoint SQL es beta/experimental; se aísla en un adaptador pequeño con timeout,
sin reintentos automáticos, con errores propagados y token oculto en diagnósticos.
No se agregan claves API, contraseñas ni permisos al PAT del proyecto de pruebas.
La regresión simula un runner sin CLI/caché y comprueba éxito y errores del batch.

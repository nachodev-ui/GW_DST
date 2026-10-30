# Integración del 2026-10-30

## Inventario

Se compararon las 18 ramas locales con `origin/main` actualizado en
`15d3f72357914576ca888dc201b7d7502fe2a98b`. No había PR abiertos.

- Trece ramas, incluido main, ya apuntaban a commits incorporados en main.
- `feat/distributor-workspace` partía del mismo main y reunía el trabajo sin commit.
- `chore/brand-identity-package`, `feat/brand-identity-integration`,
  `feat/branded-loading-video` y `feat/registration-phone` comparten el checkpoint
  `486f365`, ya sustituido funcionalmente por el PR #11. La
  [integración anterior](integration-2026-10-23.md) documenta la consolidación y la
  retirada del video y las cachés. No se reintroducen esos archivos ni se duplican
  entregas. Las ramas originales se conservan localmente.

La entrega pendiente se consolida en `feat/distributor-workspace`, mediante un PR
hacia main. No se eliminan ramas ni se escribe directamente en main.

## Contenido

Se incluyen el workspace del distribuidor (panel, ventas, operaciones, perfil,
flota y cobertura), documentación de vehículos y conductores, revisión documental
administrativa, compra con punto en mapa, seguimiento y navegación, runtime Expo 58,
herramientas de Auth/SMTP/backups, migraciones, pruebas y documentación asociada.
También se conservan los recursos y archivos ficticios de la demo. Los entornos,
credenciales, cachés y proyectos nativos generados siguen ignorados por Git.

## Correcciones de integración

- La prueba HTTPS calcula sus solicitudes desde el manifiesto de suites vigente;
  tooling comprueba explícitamente las 14 suites, sin omitir las documentales.
- El mock de postulación incluye RefreshButton y verifica sus invalidaciones.
- El visor limpia el error y el contenido desde el reintento explícito, evitando
  actualizaciones de estado síncronas al iniciar el efecto; mantiene abort y
  protección contra respuestas posteriores al desmontaje.
- Normalización de formato de los cinco archivos señalados por Prettier.
- Los PDF ficticios se marcan binarios en Git para preservar sus bytes y offsets.
- Migración `20261030053253_eligibility_invoker_wrappers.sql`: las dos RPC públicas
  de elegibilidad pasan a SECURITY INVOKER. La lectura privilegiada y sus guardas
  de miembro, administrador o conductor propio quedan en funciones privadas;
  los predicados internos de despacho siguen sin ejecución móvil. Se mantienen
  las firmas y las condiciones documentales. La suite comprueba acceso de miembro,
  conductor y administrador, y rechazo de ajenos, anónimos y acceso al helper interno.

Se sigue el patrón existente de funciones privadas y
[las recomendaciones de Supabase sobre funciones](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker).
No se flexibiliza la assertion de seguridad que detectó los definers públicos.

## Evidencia y límites

- Typecheck y formato aprobados; lint sin errores, con cuatro advertencias de
  imports duplicados y compatibilidad de React Hook Form con React Compiler.
- Regresión offline: 67 pruebas Node y la suite PowerShell aprobadas.
- Cobertura configurada: 98,42 % líneas/statements, 92,59 % funciones y 87,56 % ramas.
  Son los siete módulos definidos en `.c8rc.json`, no toda la aplicación.
- Pruebas sintéticas de backup cifrado y helper SMTP aprobadas, sin servicios cloud.
- Gitleaks 8.30.1, con checksum oficial verificado: sin hallazgos en archivos
  candidatos ni historial local disponible, incluido el checkpoint antiguo.
- Las 14 suites SQL pasaron en Gasway Test con la migración correctiva incorporada
  temporalmente y rollback de la corrección y los fixtures en cada transacción.
  La ejecución normal anterior detectó los dos definers públicos en pilot_security;
  no se confunde ese fallo con un problema de conexión ni se oculta la prueba.
- No se aplicaron migraciones persistentemente ni se modificó el proyecto de la app.
  La corrección nueva requiere despliegue autorizado antes del runner SQL normal.
- Advisors de Test, sobre su estado persistente: dos WARN por esas RPC públicas
  y el WARN conocido de protección contra contraseñas filtradas deshabilitada.
  No se presenta esa lectura como advisors sobre la corrección transitoria.
- No se renderizó la app ni se probaron emuladores, cámara, GPS o dispositivos.
  Los pendientes de piloto y evidencia física conservan su estado documentado.

El primer intento de pruebas offline fue bloqueado por `spawn EPERM` del sandbox;
la ejecución válida se hizo con permiso para subprocesos. El CLI Supabase también
requirió permiso para su telemetría local. Estos fallos del entorno no son
resultados de las assertions. Los checks de GitHub y el merge se consultan en el PR.

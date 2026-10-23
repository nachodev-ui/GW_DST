# 0024 — Verificación operativa sin modificar el proyecto de la app

Fecha: 2026-10-22. Estado: aceptado.

## Decisión

DT-07 separa el inventario SQL de solo lectura (apto para el proyecto de la app)
de las regresiones con escrituras, restringidas a Gasway Test por allowlist y
marcador privado. El runner existente incorpora una octava suite con rollback.
Un smoke separado comprueba Auth y Data API reales con cuentas temporales: usa
claves obtenidas en memoria de la CLI local, rechaza CI y limpia usuarios/sesiones
en finally. No necesita nuevos secrets de GitHub ni envía correos.

Gitleaks CLI 8.30.1 se ejecuta sin licencia de action externa, con checksum fijo,
historial completo, control positivo y logs redactados. Se extienden sus reglas;
las excepciones deben identificar una coincidencia falsa concreta, sin excluir
archivos/commits completos ni silenciar hallazgos reales con un baseline.

## Consecuencias

Advisors limpios, migraciones reproducibles o cuentas confirmadas por Admin no
demuestran entrega de correo, enlaces ni recuperación de datos. DT-07 permanece
abierto hasta verificar esos controles y el entorno concreto del piloto.
No se sincroniza config.toml automáticamente ni se restaura sobre la app.
Planes pagos y política de recuperación requieren decisión del propietario.

Evidencia, comandos y pendientes: [seguridad del piloto](../pilot-security.md).

# Integración de entregas del 2026-10-23

## Ramas y contenido

Base revisada: origin/main en 912539a. No había PR abiertos al iniciar esta
integración. Las ramas de DT-02, cierre DT-02, corrección SQL IPv4, DT-03 y cierre
DT-03 ya son ancestros de main y no requieren una segunda fusión.

Las ramas chore/brand-identity-package, feat/brand-identity-integration,
feat/branded-loading-video y feat/registration-phone apuntaban al mismo checkpoint
486f365, único commit local fuera de main. Ese checkpoint ya contenía la entrega
de DT-07 aunque chore/dt-07-pilot-security todavía apuntara a main. Los cambios
posteriores estaban juntos, sin commit, en el checkout compartido.

Se reúne el estado final en chore/integrate-dt07-brand-registration para un solo
PR hacia main. El PR usa un commit consolidado; el checkpoint se conserva en las
ramas locales originales. Así se evita publicar el video y las cachés retiradas
en el historial intermedio. No hace falta publicar ramas duplicadas para entregar
su contenido y no se escribe directamente en main.

| Entrega           | Estado que se integra                                                                                                                            | Pendientes conservados                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| DT-07             | Auditoría, scripts, suite SQL de seguridad, workflow Gitleaks y confirmación nativa PKCE; condición 1 cerrada por evidencia manual del operador. | Condiciones 2–6; causa histórica de localhost indeterminada.                            |
| Identidad         | Paquete SVG/PNG y ZIP, sincronización reproducible, paleta, logo compartido, iconos y splash.                                                    | Revisión visual en binarios Android/iOS; no se ejecuta aquí.                            |
| Carga             | Solo logo en espera normal, accesibilidad, demora y reintento; video y expo-video retirados.                                                     | Validación visual de dispositivo separada.                                              |
| Acceso y registro | Diseño renovado; correo/contraseña → teléfono chileno → confirmación; borrador en memoria y reintento explícito.                                 | Prueba manual del registro nuevo y política de abuso servidor.                          |
| Datos             | Migración 20261023180000_registration_phone.sql y suite pilot_security actualizada.                                                              | Despliegue ya documentado en Test/app; no se vuelve a aplicar durante esta integración. |
| Mantenimiento     | Arranque desde workspace, README/AGENTS/ROADMAP y condiciones DT-07 alineados; cachés CLI anidadas excluidas.                                    | Integrar código no habilita el piloto.                                                  |

## Evidencia y límites

Los resultados previos se conservan en [confirmación](auth-confirmation.md),
[registro](registration-phone.md), [marca](brand-package.md),
[carga](loading-screen.md) y [pruebas](testing.md). No se atribuye al nuevo registro
la validación manual de un flujo anterior. Los scripts administrativos se publican
con sus guardas; no se ejecutan para consolidar ramas.

La verificación de integración se registra a continuación. No se
compila ni se renderiza la app, no se abren emuladores, no se crean cuentas ni se
envían correos; no se modifican proyectos Supabase ni se aplican migraciones.

El paquete independiente de marca conserva sus bytes, manifiesto, hashes y ZIP;
se excluye del formateador general. El registro append-only auth-confirmation.md
también conserva su contenido previo y no se reformatea. Estas exclusiones no
afectan al análisis de secretos.

## Verificación local de la integración

- Typecheck final: aprobado.
- Lint: aprobado, sin errores; quedan cinco avisos de imports duplicados y
  compatibilidad de watch de React Hook Form con React Compiler.
- Formato: aprobado; se preservan las exclusiones documentadas arriba.
- Regresión completa: 17/17 suites Node y una PowerShell aprobadas.
- Cobertura de los siete módulos configurados: 98,41 % líneas/statements,
  92,59 % funciones y 87,56 % ramas; supera los umbrales vigentes.
- Después de los últimos ajustes de Auth, sus dos suites afectadas volvieron a
  pasar. La nueva assertion comprueba que cambiar de enlace no reutiliza el
  éxito del anterior.
- Integridad del paquete de marca: 194 hashes y checksum del ZIP correctos.

Se corrigieron dos incompatibilidades entre entregas en las pruebas: conteo SQL
antiguo de siete en lugar de ocho y mocks incompletos de navegación. Lint detectó
tres errores adicionales de Auth. El envío ahora crea el handler validado desde
el evento, la confirmación deriva su estado de un resultado asociado a su URL y
el reloj de reintento sincroniza después del commit con protección de desmontaje.
Se mantienen el bloqueo de envíos simultáneos y la deduplicación de códigos PKCE.

El primer intento del runner estuvo bloqueado por spawn EPERM del sandbox; se
repitió con autorización para sus subprocesos offline. No fue un resultado válido
de las regresiones. Gitleaks no encontró secretos en el historial disponible,
incluido el primer commit final. GitGuardian marcó dos expresiones de contraseña
aleatoria del checkpoint como Generic Password: ambas concatenaban un prefijo
de clases de caracteres con randomBytes y no contenían credenciales guardadas.
Se hizo explícita la generación en tiempo de ejecución antes de añadir las clases
requeridas, sin reducir entropía ni ejecutar los scripts de cuentas/correo.
El commit consolidado excluye aquel historial intermedio del PR. El resultado de
Actions y la URL del PR se conservan en GitHub, separados de la evidencia cloud
histórica.

# DT-07, condición 4 — Backup cifrado fuera del proyecto

Estado al **2026-10-23: parcial**. Primera copia creada y verificada en Drive.
Falta la segunda copia de la clave de recuperación fuera de este PC: el
operador indicó **«Lo haré después»**. El simulacro de restauración es condición 5.

## Decisiones aprobadas por Nacho

- Destino: **Google Drive privado**, separado del proyecto Supabase.
- Responsable: **Nacho**, operación unipersonal.
- Objetivos: **RPO ≤24 h**, pérdida máxima objetivo de datos; **RTO ≤4 h**,
  tiempo objetivo para recuperar la operación. Aprobados el 2026-10-23;
  **no son garantías actuales**, ni tiempos demostrados.
- Copias automáticas cada **12 horas** en este chat, con aviso ante fallos o
  intervención necesaria. Automatización **Backups privados de Gasway**,
  ID `backups-privados-de-gasway`, **ACTIVE**. Alta confirmada por la herramienta
  y configuración guardada comprobada: heartbeat cada 12 h. La primera ejecución
  programada todavía no se ha observado; la copia inicial fue ejecutada en este chat.
- No se activaron planes pagos, PITR ni almacenamiento de pago.

## Primera copia: evidencia de ejecución

Fuente: **Gasway Project**, ref `gleltbrvpfvfgggcatpt`, PostgreSQL **17.11**.
Inicio **2026-10-23 21:38:06**, fin **21:39:18**, America/Santiago
(`2026-10-24T00:38:06.058Z` a `00:39:18.915Z`). Exportación y comprobación local:
aproximadamente **73 segundos**. Esto no mide el RTO.

Carpeta: [Gasway Backups](https://drive.google.com/drive/folders/1egeQQQ7qqEXJ12tecvwRLV_B-z-ZetoG).
Permisos revisados en carpeta y los tres archivos: **shared=false**, solo la
cuenta del operador como owner; sin permisos anyone, domain ni otros usuarios.

| Archivo cifrado                                                                                 | Tamaño       | SHA-256                                                            |
| ----------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------ |
| [Base PostgreSQL](https://drive.google.com/file/d/19e6hfRsmpj5RTJaCJtTkbu0sHSN3ZzWs/view)       | 554615 bytes | `6b7bcf4e31b5c170cbdad1b41279fa5bc05ec5bcd42fdc3d21253c670d6abfb3` |
| [Roles sin contraseñas](https://drive.google.com/file/d/1tXmmTUvqK7WoLfyQRFZDhHjmZq853J2x/view) | 6527 bytes   | `e2d892ea720882f381954bf9537b6831657938fd423744775dde530ce4ef9ec9` |
| [Manifiesto](https://drive.google.com/file/d/1nJ0Ro3tYg6jsxZt9nRE9zRah2tsBVdmT/view)            | 1128 bytes   | `e95d3cbd5758cd12f38fdee3ab800021026a3a2dd5545e04b83637e137f102d3` |

Conjunto `gleltbrvpfvfgggcatpt-20261024T003806Z`. Cada archivo se descifró
completamente en memoria y su SHA-256 en claro coincidió con el flujo exportado.
Tras subirlos, se descargaron los tres archivos **cifrados** y sus SHA-256
coincidieron con los locales. Las descargas temporales se eliminaron.
No se restauró sobre ninguna base ni se crearon cuentas.

## Implementación

- `pg_dump` nativo **18.4**, formato custom, exporta datos y definiciones de
  `public`, `private`, `auth`, `storage` y `supabase_migrations`. Conserva las
  definiciones de RLS, políticas, funciones, grants y propietarios del archivo;
  esto no prueba que se restauren correctamente en otro proyecto.
- `pg_dumpall --roles-only --no-role-passwords` produce el archivo separado de
  roles. Contiene metadatos de roles administrados que no deben aplicarse a
  ciegas sobre un Supabase nuevo.
- `age` **1.3.2**, destinatario X25519: cifrado autenticado estándar. Distribución
  oficial Windows AMD64, SHA-256 del ZIP
  `f48d8f8f9ebe903ab5027ed067652f2cc1db94bc206976430133b905dcd8e8c7`.
- `pg_dump → age` mediante streams binarios Node: **no se escribe un dump sin
  cifrar en disco**. El descifrado de comprobación termina en un hash en memoria.
- La sesión CLI local obtiene credenciales temporales mediante `db dump
--dry-run`; solo se interpretan asignaciones literales de conexión validadas
  contra la ref y el pooler. No se ejecuta el script de shell generado ni se
  imprimen credenciales. Contraseña solo en el entorno del proceso hijo, TLS
  requerido, destino/ref explícitos, sin cambiar el enlace CLI de la app.
- Sin Docker, sin secretos de CI nuevos y sin dumps en Git o CI artifacts.
  La copia GPG incluida en Git no pudo iniciar `keyboxd`; no se usó para cifrar.
- Lock local, salidas exclusivas sin sobrescritura, límite de 15 min por proceso,
  eliminación de salidas cifradas parciales ante error y recibo solo al finalizar.

El manifiesto cifrado registra fuente, hora, esquemas, versión/tamaño de DB y
recuentos de Auth/Storage tomados **antes** del dump. Los recuentos no pertenecen
al snapshot de `pg_dump`; no tratarlos como prueba de integridad de restauración.
El recibo local registra tamaños/hashes de los archivos cifrados y estado de envío.
El recibo de esta primera copia quedó con `uploaded=true`, privacidad y readback
SHA-256 verificados, junto con los tres IDs de Drive. El manifiesto registra
5 usuarios Auth y 0 objetos Storage al medir antes del dump; son recuentos
agregados, sin datos de usuarios en la documentación.

## Clave y custodia

Raíz local: `%LOCALAPPDATA%\Gasway\Backups`, fuera del checkout y de Drive.
ACL restringida al usuario actual y SYSTEM. Contiene:

- `keys\identity.agekey`: **clave privada**, necesaria para recuperar las copias.
  Es un archivo secreto protegido por ACL local; no tiene contraseña adicional.
- `keys\recipient.txt`: destinatario público; permite cifrar nuevas copias.
- `archives\`: exclusivamente exportaciones cifradas y recibos de metadatos.
- `tools\age-v1.3.2\`: herramienta verificada.

El usuario debe conservar una segunda copia de **identity.agekey** en un USB
privado o almacén seguro independiente del Drive de backups y del PC. **Pendiente
de confirmación**; perder la única clave local impediría recuperar estas copias.
No enviarla al chat, al repositorio, a CI ni a la carpeta de Drive de backups.
El inicializador reutiliza una clave existente y no la sobrescribe.

## Repetir la copia y comprobar el envío

Preparación inicial, ya realizada en este PC:

```powershell
npm run backup:init
```

Crear y comprobar una copia cifrada:

```powershell
npm run backup:create -- --project-ref gleltbrvpfvfgggcatpt
```

El comando es local, rechaza CI y solo admite refs explícitas de Gasway.
**No sube archivos por sí solo**: el agente utiliza después el conector Drive.
Solo subir los tres archivos `.age` enumerados en el recibo; comprobar que
carpeta y archivos siguen privados, tamaños y SHA-256 mediante descarga cifrada.
Actualizar el recibo a enviado únicamente cuando el conjunto esté completo y
verificado. Un recibo `uploaded:false` representa una copia local, no una copia
externa terminada. No volver a subir conjuntos completos ya registrados.

Retención inicial: conservar las copias verificadas; **sin borrado automático**.
Definir y aprobar la depuración antes de acumular almacenamiento significativo.
El operador debe comprobar las alertas y la antigüedad de la última copia externa;
un backup de más de 24 h incumple el objetivo de RPO.

## Límites y condiciones restantes

- Las ejecuciones locales dependen del PC, Codex, red y sesiones de Supabase/Drive.
  Un horario guardado no garantiza ejecución ni una copia nueva en 24 h.
- Pendiente la **custodia de clave fuera del PC**; por eso condición 4 parcial.
- No incluye bytes de archivos Storage, configuración cloud de Auth/SMTP/
  redirects, claves API/JWT/firma, contraseñas de roles ni Vault/claves raíz.
  Se requiere recuperación separada y revisar su presencia antes del piloto.
- El dump es lógico y selectivo; no es una copia física integral del proveedor.
  Requiere extensiones/plataforma compatibles. Cliente 18.4 frente a servidor
  17.11: la compatibilidad del restore debe comprobarse en condición 5.
- Restauración aislada, integridad, recuentos, Auth, grants, RLS, RPC y tiempo
  hasta operación siguen **sin ensayar**. No restaurar el archivo sobre la app.
- La condición 6 mantiene pendientes las regresiones SQL y advisors del piloto.

Validación: pruebas sintéticas de límites de conexión/TLS, round-trip binario,
rechazo de clave equivocada/manipulación, no sobrescritura y limpieza ante fallo
del productor; exportación cloud real y verificación de hashes en Drive descritas
arriba. Typecheck móvil correcto. No equivale al ensayo de restauración de
condición 5 ni a una nueva ejecución de las suites SQL de condición 6.

## Fuentes

- [Supabase: backups y recomendación para Free](https://supabase.com/docs/guides/platform/backups).
- [CLI db dump y exclusiones por defecto](https://supabase.com/docs/reference/cli/supabase-db-dump).
- [Supabase: restauración y consideraciones de plataforma](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
- [PostgreSQL: pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html).
- [age: herramienta y formato](https://github.com/FiloSottile/age).

# Reemplazar el token de Supabase usado por GitHub Actions

Guía preparada el **2026-10-23**. **Referencia para futuras renovaciones; no
requiere ejecución ahora.** El operador confirmó que `gasway-github-tests` es
el token de `SUPABASE_TEST_ACCESS_TOKEN`; la condición 3 quedó cerrada sin
reemplazo. La guía no se ejecutó. Renovar antes de su caducidad, 2026-11-21;
el nombre y la fecha sugeridos abajo corresponden a la preparación original.

## Qué se reemplaza

PAT significa Personal Access Token: una credencial de Supabase. GitHub Actions
la usa para ejecutar las pruebas automáticas contra **Gasway Test**. CI es esa
ejecución automática de pruebas en GitHub.

GitHub guarda esta credencial en un campo protegido, llamado secret:
**SUPABASE_TEST_ACCESS_TOKEN**, dentro del environment **gasway-test** del
repositorio **nachodev-ui/GW_DST**. Se reemplaza **el valor de ese campo**;
su nombre se conserva y los workflows ya existentes lo utilizan.

La correspondencia con el PAT actual está confirmada por el operador. Este
procedimiento sirve para una futura renovación; crear un reemplazo permite
registrar su nuevo alcance y vencimiento.

## 1. Crear el reemplazo en Supabase

Abre [Supabase → Access Tokens](https://supabase.com/dashboard/account/tokens)
con tu cuenta de Gasway y pulsa **Generate new token**. Utiliza el token con
alcance configurable; no el tipo Legacy de acceso completo.

Configura:

| Campo                   | Valor                                                                         |
| ----------------------- | ----------------------------------------------------------------------------- |
| Nombre                  | `gasway-github-tests-2026-10-23`                                              |
| Recursos / Projects     | Solo **Gasway Test**, ref `xnrueexpwzvxotgwmamj`                              |
| Permisos / Capabilities | Solo **Database → Read-write**                                                |
| Caducidad / Expiry      | Fecha sugerida: **2026-11-21**, conservando el vencimiento del token revisado |

Los tests crean datos temporales y los limpian; por eso requieren escritura en
Test. Los runners actuales solo llaman al endpoint de consultas SQL por HTTPS;
no necesitan Project Settings, Auth, API Keys ni permisos de organización.

Revisa el resumen y genera el token. Su valor se muestra al crearlo: cópialo
directamente para el siguiente paso. No lo pegues en el chat ni lo guardes en
el repositorio o un archivo `.env`.

## 2. Reemplazar el valor en GitHub

1. Abre [GW_DST → Settings → Environments](https://github.com/nachodev-ui/GW_DST/settings/environments).
2. Entra en **gasway-test**.
3. En **Environment secrets**, busca **SUPABASE_TEST_ACCESS_TOKEN**.
4. Pulsa el lápiz / **Edit** de ese secret.
5. Pega el token nuevo en el campo de valor y pulsa **Update secret**.

El campo anterior no muestra el valor guardado; eso es normal. Actualiza el
secret del environment indicado, conservando su nombre. La variable
`GASWAY_TEST_PROJECT_REF` se mantiene en `xnrueexpwzvxotgwmamj`.

## 3. Comprobar que funciona

1. En [GitHub Actions](https://github.com/nachodev-ui/GW_DST/actions), abre
   **Regresiones SQL en Gasway Test**.
2. Pulsa **Run workflow**, elige **main** y confirma **Run workflow**.
3. Si solicita aprobación del environment, abre **Review deployments**,
   selecciona **gasway-test** y aprueba la ejecución.
4. Espera el resultado verde. Después repite con
   **Concurrencia SQL en Gasway Test**, también sobre **main**.

Son las pruebas existentes contra Test y escriben fixtures temporales con su
limpieza correspondiente. La guía no inicia esos workflows por sí sola.
Si falla una ejecución, conserva su enlace para revisar el error antes de
cambiar permisos o repetirla. No publiques el token en logs ni capturas.

## 4. Registrar la evidencia

Comparte únicamente el **nombre del token**, la **fecha de caducidad** y los
**enlaces de ambas ejecuciones**. Con ello se puede registrar el reemplazo y
verificar el uso del secret sin revelar su valor. Mantén los tokens anteriores
hasta verificar el nuevo y confirmar qué consumidores usan cada uno; su
retirada es un paso posterior a identificar esos usos.

## Fuentes

- [Supabase: PAT y capacidades](https://supabase.com/docs/guides/platform/personal-access-tokens).
- [Supabase: selección de recursos y caducidad](https://supabase.com/changelog/scoped-personal-access-tokens-ga).
- [GitHub: secretos de environments](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets#creating-secrets-for-an-environment).

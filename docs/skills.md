# Skills del repositorio

Instaladas en .agents/skills, descubribles por Codex en el próximo turno. Se descargaron
los directorios originales completos mediante el instalador de skills de Codex, con
referencias, scripts/datos incluidos y commits fijados. No se ejecutaron scripts de
terceros, hooks, telemetría, proxies, builds ni verificaciones visuales.

| Skill instalada        | Qué hace                                                             | Cuándo usarla                                                                              |
| ---------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| ui-ux-pro-max          | Diseño, accesibilidad y búsqueda local de patrones.                  | Al diseñar componentes o ajustar el theme; requiere Python 3, sin paquetes extra.          |
| frontend-design        | Dirección visual de Anthropic.                                       | En futuras interfaces, especialmente admin web; no sustituye patrones nativos.             |
| react-native-skills    | Prácticas React Native/Expo de Vercel.                               | Componentes, rendimiento y APIs nativas. Nombre declarado: vercel-react-native-skills.     |
| expo-overview          | Guía y selección de documentación Expo.                              | Planificar cambios del framework.                                                          |
| expo-project-structure | Estructura de proyectos Expo.                                        | Modificar monorepo o límites de módulos.                                                   |
| expo-router            | Navegación con Expo Router.                                          | Agregar rutas y layouts cuando se implementen flujos.                                      |
| expo-upgrade           | Actualizaciones de SDK Expo.                                         | Solo al solicitar o necesitar migrar SDK.                                                  |
| caveman                | Comprimir explicaciones manteniendo precisión.                       | Respuestas breves; no sacrificar claridad ni aplicar porcentajes de ahorro como garantías. |
| napkin                 | Memoria breve y curada por repositorio.                              | Leer/curar .claude/napkin.md al comenzar sesiones; también compatible con Codex.           |
| ponytail               | Cambios mínimos y evitar sobreingeniería.                            | Implementación/refactorización enfocada dentro del alcance pedido.                         |
| gasway-domain          | Reglas propias de GLP en Chile, estados, dinero, roles y privacidad. | Cambios de esquema, contratos, pedidos o documentación del dominio.                        |

Las reglas del usuario y AGENTS.md prevalecen sobre sugerencias de skills: no iniciar
renders, simuladores, capturas, verificaciones repetidas ni servicios facturables.
Instalar una skill no implica implementar sus recomendaciones ni activar integraciones.
Las skills visuales quedan disponibles para trabajo futuro; esta tarea no diseña pantallas.

## Adaptaciones mínimas para Codex

- UI-UX-Pro-Max: reemplazada la ruta de ejemplo dependiente de CLAUDE_PLUGIN_ROOT por
  .agents/skills/ui-ux-pro-max; datos y scripts originales conservados. Desde la raíz:
  python .agents/skills/ui-ux-pro-max/scripts/search.py "mobile delivery" --stack react-native.
- Napkin: author/version/date movidos a metadata en el frontmatter; instrucciones
  originales conservadas. La memoria permanece en .claude/napkin.md porque así la lee
  la skill upstream; no requiere Claude Code.
- Conservadas licencias internas y copiadas las licencias raíz cuando existen.
  Frontend Design incluye su LICENSE.txt original; respetar sus términos.
- El paquete React Native de Vercel incluye su propia documentación de licencia MIT.

## Procedencia

Fuentes primarias de cada autor, no agregadores ni imitaciones. Snapshot del 2026-10-17;
ver docs/skill-sources.json para rutas y revisiones legibles por herramientas.

| Directorio             | Fuente original fijada                                                                                                                                                     | Commit                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| ui-ux-pro-max          | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/56ea9cf174ed86786187daa9de0e6247cb0747e4/.claude/skills/ui-ux-pro-max) | 56ea9cf174ed86786187daa9de0e6247cb0747e4 |
| frontend-design        | [anthropics/skills](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design)                                             | dbd4588f9e1033efb41dad4bef2f7947c8993d44 |
| react-native-skills    | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-native-skills)                           | 063bee94c3f4df8453406c830b0a7df0f2860278 |
| expo-overview          | [expo/skills](https://github.com/expo/skills/tree/7ddc1f5796996e5c7efe2fc3fa9168eb24e8dac1/plugins/expo/skills/expo-overview)                                              | 7ddc1f5796996e5c7efe2fc3fa9168eb24e8dac1 |
| expo-project-structure | [expo/skills](https://github.com/expo/skills/tree/7ddc1f5796996e5c7efe2fc3fa9168eb24e8dac1/plugins/expo/skills/expo-project-structure)                                     | 7ddc1f5796996e5c7efe2fc3fa9168eb24e8dac1 |
| expo-router            | [expo/skills](https://github.com/expo/skills/tree/7ddc1f5796996e5c7efe2fc3fa9168eb24e8dac1/plugins/expo/skills/expo-router)                                                | 7ddc1f5796996e5c7efe2fc3fa9168eb24e8dac1 |
| expo-upgrade           | [expo/skills](https://github.com/expo/skills/tree/7ddc1f5796996e5c7efe2fc3fa9168eb24e8dac1/plugins/expo/skills/expo-upgrade)                                               | 7ddc1f5796996e5c7efe2fc3fa9168eb24e8dac1 |
| caveman                | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman/tree/bad48a0e1df55e05e3f52249afa35ecc1909ee76/skills/caveman)                                             | bad48a0e1df55e05e3f52249afa35ecc1909ee76 |
| napkin                 | [blader/napkin](https://github.com/blader/napkin/tree/27fa60a895de4383b26a539136bc983155cb979c/)                                                                           | 27fa60a895de4383b26a539136bc983155cb979c |
| ponytail               | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail/tree/1099dd9128da88e8470338679b6f2d266382482b/skills/ponytail)                                        | 1099dd9128da88e8470338679b6f2d266382482b |

## Pendientes

| Skill               | Fuente revisada                                                     | Estado y motivo                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graphify (opcional) | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) | Pendiente. El upstream tiene instrucciones específicas para Codex, pero requiere instalar el CLI/runtime Python y sus recursos. No se instala un SKILL.md incompleto ni dependencias adicionales en este scaffolding vacío. Evaluar al crecer el código. |

Ponytail sí se encontró en la fuente del autor y quedó instalada. No hay skills
obligatorias pendientes. gasway-domain es propia, corta y no inventa integraciones.

## Validación de la skill propia

El validador oficial quick_validate.py se intentó una vez, pero no pudo iniciar porque
el runtime Python no tiene PyYAML (ModuleNotFoundError: yaml). No se agregaron
dependencias ni se repitió el chequeo. gasway-domain usa los campos requeridos name
y description y un cuerpo breve; queda pendiente ejecutar el validador cuando el
entorno lo incluya. El único typecheck de la app sí terminó aprobado.

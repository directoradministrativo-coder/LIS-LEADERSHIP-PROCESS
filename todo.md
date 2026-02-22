# LIS Process Survey - TODO

## Configuración y Diseño
- [x] Configurar colores corporativos LIS en theme.config.js
- [x] Copiar logo LIS al proyecto
- [x] Generar logo de app y configurar branding
- [x] Actualizar app.config.ts con nombre y branding

## Base de Datos
- [x] Diseñar esquema de base de datos (usuarios, procesos, organigramas, KPIs, DOFA, proveedores, clientes)
- [x] Crear migraciones de base de datos
- [x] Configurar autenticación de usuarios

## Módulo de Autenticación
- [x] Pantalla de login con logo LIS
- [x] Validación de credenciales de líderes de área
- [x] Sesión persistente con autenticación OAuth

## Dashboard Principal
- [x] Pantalla de bienvenida con nombre del proceso
- [x] Indicadores de progreso por módulo
- [x] Navegación a cada sección

## Módulo 1 - Nombre del Proceso
- [x] Campo de texto para nombre del proceso
- [x] Guardado automático

## Módulo 1.1 - Organigrama del Área
- [x] Visualización jerárquica del organigrama
- [x] Jerarquías: Director, Gerente, Coordinador, Analista, Auxiliar
- [x] Botones Agregar/Modificar/Eliminar por jerarquía
- [x] Campo de nombre de colaborador
- [x] Campo de funciones por colaborador
- [x] Toggle para mostrar/ocultar funciones
- [x] Crear nueva jerarquía personalizada
- [x] Exportar organigrama a Excel (.xlsx)

## Módulo 2 - KPIs del Proceso
- [x] Formulario con 5 campos obligatorios (Nombre, Objetivo, Frecuencia, Fórmula, Responsable)
- [x] Agregar múltiples KPIs
- [x] Tabla de KPIs registrados
- [x] Exportar tabla KPIs a Excel (.xlsx)

## Módulo 3 - DOFA
- [x] Matriz DOFA con 4 cuadrantes
- [x] Campos editables por cuadrante
- [x] Exportar DOFA a Excel (.xlsx)

## Módulo 4 - Proveedores del Proceso
- [x] Selector de proceso proveedor (lista predefinida + "Otro")
- [x] Campo de tarea/actividad
- [x] Campo de documento/ruta/entregable
- [x] Campo de rol responsable
- [x] ANS: selector numérico (1-9) + tipo (días calendario, días hábiles, semanas, meses)
- [x] Botón "No se ha definido ANS" con condicionalidad
- [x] Calificación de cumplimiento ANS (1-5)
- [x] Agregar múltiples proveedores y tareas
- [x] Sección de fortalezas por proveedor
- [x] Sección de oportunidades por proveedor
- [x] Exportar tabla Interacciones a Excel (.xlsx)

## Módulo 5 - Clientes del Proceso
- [x] Selector de proceso cliente (lista predefinida + "Otro")
- [x] Campo de tarea/actividad
- [x] Campo de documento/ruta/entregable
- [x] Campo de rol responsable
- [x] ANS: selector numérico (1-9) + tipo
- [x] Botón "No se ha definido ANS" con condicionalidad
- [x] Calificación de cumplimiento ANS (1-5)
- [x] Agregar múltiples clientes y tareas
- [x] Sección de fortalezas por cliente
- [x] Sección de oportunidades por cliente

## Reportes y Exportación
- [x] Pantalla de reportes centralizados
- [x] Exportar organigrama a Excel
- [x] Exportar KPIs LIS a Excel
- [x] Exportar DOFA LIS 2026 a Excel
- [x] Exportar tabla Interacciones Procesos a Excel

## Pruebas y Optimización
- [x] Tests de servidor (API health, auth, KPIs, DOFA) - 9/9 pasando
- [x] Revisión de identidad visual LIS
- [x] TypeScript sin errores

## Ajustes v2 - Roles, Organigrama Visual, Validaciones

### Sistema de Roles
- [x] Agregar campo `role` (user/admin) a la tabla de usuarios autorizados
- [x] Crear tabla `authorizedUsers` con email, nombre, área, rol
- [x] Pantalla de administración de usuarios (agregar/importar CSV)
- [x] Validar usuario en lista cerrada al momento del login
- [x] Mostrar mensaje de "no autorizado" si el email no está en la lista
- [x] Enrolamiento automático con Gmail si es primera vez
- [x] Panel de administrador: ver todos los procesos registrados
- [x] Descarga consolidada (todos los procesos) o selección individual para admin

### Organigrama Visual
- [x] Nueva pestaña "Vista Organigrama" habilitada después de completar el módulo
- [x] Visualización gráfica SVG/Canvas del organigrama del proceso (vista usuario)
- [x] Botón mostrar/ocultar funciones en cada nodo del organigrama
- [x] Vista administrador: organigrama consolidado de todos los procesos

### Validaciones de Campos Obligatorios
- [x] Validación en módulo Proceso (nombre del proceso, área)
- [x] Validación en módulo Organigrama (nombre del colaborador obligatorio)
- [x] Validación en módulo KPIs (todos los campos obligatorios)
- [x] Validación en módulo DOFA (al menos un ítem por cuadrante)
- [x] Validación en módulo Interacciones (campos obligatorios ANS)
- [x] Cuadro de texto con lista de campos faltantes al intentar guardar

### Correcciones y Mejoras
- [x] Corregir opciones ANS: "Días calendario", "Días hábiles", "Semanas", "Meses"
- [x] Agregar campo "Observaciones" en módulo Interacciones (Proveedores/Clientes)
- [x] Agregar campo "Observaciones" en módulo KPIs
- [x] Agregar campo "Observaciones" en módulo DOFA

## Ajustes v3 - SuperAdmin, visualización y botón de configuración

- [x] Corregir pantalla en blanco / problema de indexación en web
- [x] Agregar perfil SuperAdmin en la tabla authorizedUsers (enum: user, admin, superadmin)
- [x] Actualizar los 2 usuarios existentes a rol superadmin
- [x] Implementar selector de perfil en login para usuarios SuperAdmin
- [x] Agregar botón de configuración (gestión de usuarios) visible en el header
- [x] Asegurar que el tab Admin Usuarios sea accesible para admin y superadmin

## Bug Fix v5 - Login
- [ ] Corregir bug: app queda atascada en "Iniciando sesión..." sin redirigir al login cuando no hay sesión
- [ ] Agregar timeout/fallback: si en 3s no hay sesión, redirigir automáticamente a /login

## Bug Fix v6 - Navegación y Usuarios
- [x] Bug: botón "Salir" no redirige a la pantalla de login
- [x] Bug: botón "Volver al inicio" en pantalla de acceso no autorizado no redirige al login
- [x] Agregar director.planeacion@lis.com.co como superadmin

## Bug Fix v7 - Visibilidad Gestión de Usuarios
- [x] Bug: pestaña "Usuarios" no visible para admin/superadmin (isAdmin basado en rol OAuth, no en tabla LIS)
- [x] Corregir: usar rol del checkAuthorization (tabla LIS) para mostrar/ocultar pestaña Usuarios
- [x] Verificar que botón de configuración en header navega correctamente a pestaña Usuarios

## Feature v8 - Indicador de Progreso
- [x] Crear endpoint trpc para consultar el progreso por módulo (cuántos tienen registros)
- [x] Agregar barra de progreso visual en el dashboard (X de 5 módulos completados)
- [x] Mostrar estado individual por módulo (completado/pendiente) en las tarjetas del dashboard

## Feature v9 - Módulo Proyectos, Vista Consolidada, Fecha Límite

### BD y Servidor
- [x] Tabla `projects`: nombre, descripción, impacto (1-5), dificultad (1-5), subtotal, estado, observaciones, processId, hasNotification
- [x] Tabla `appConfig`: clave/valor para fecha límite global y otras configuraciones
- [x] Endpoints tRPC: projects.list, projects.create, projects.update, projects.delete
- [x] Endpoints tRPC: admin.projects.listAll, admin.projects.updateProject, admin.projects.updateStatus
- [x] Endpoint tRPC: config.getDeadline, config.setDeadline (solo admin)
- [x] Endpoint tRPC: admin.progress.listAll (progreso consolidado de todos los usuarios)
- [x] Notificación in-app (campo hasNotification en BD) cuando admin modifica proyecto

### Módulo Usuario - Proyectos
- [x] Pantalla `proyectos.tsx`: lista de proyectos ordenados por subtotal desc
- [x] Formulario para crear/editar proyecto (nombre, descripción, impacto, dificultad)
- [x] Selector visual de calificación 1-5 con etiquetas descriptivas
- [x] Cálculo automático de subtotal (impacto × dificultad) y ordenamiento
- [x] Badge de estado con color (Por Priorizar=rojo, En Ejecución=amarillo, Finalizado=verde, Suspendido=naranja, Cancelado=rojo)
- [x] Notificación visible en tarjeta cuando admin modifica el proyecto
- [x] Marcar notificación como leída al abrir el módulo de proyectos
- [x] Etiquetas de dificultad corregidas: 1=Muy Difícil, 5=Muy Fácil

### Módulo Admin - Proyectos
- [x] Pantalla `admin-proyectos.tsx`: vista consolidada de proyectos por área
- [x] Ordenamiento descendente por subtotal (impacto × dificultad)
- [x] Edición de calificaciones (impacto y dificultad) por proyecto
- [x] Selector de estado con colores (Por Priorizar, En Ejecución, Finalizado, Suspendido, Cancelado)
- [x] Cuadro de diálogo de observaciones para Suspendido y Cancelado

### Vista Consolidada de Progreso (Admin)
- [x] Pantalla `admin-progreso.tsx`: tabla con nombre del área, módulos completados, porcentaje
- [x] Accesible desde el panel de administrador (tab Progreso)

### Fecha Límite con Contador Regresivo
- [x] Campo configurable en panel admin para fecha límite global
- [x] Contador regresivo visible en el dashboard de cada usuario
- [x] Exportación de proyectos incluida en Excel (hoja Proyectos)

### Notificaciones
- [x] Notificación in-app en tarjeta de proyectos cuando admin modifica
- [x] Marcar notificación como leída al abrir el módulo de proyectos

## Branding v10 - Ícono del cubo LIS
- [x] Recortar solo el cubo LIS (sin leyenda) del logo corporativo
- [x] Reemplazar icon.png, splash-icon.png, favicon.png, android-icon-foreground.png con el cubo
- [x] Actualizar logoUrl en app.config.ts con URL pública del cubo

## Feature v11 - Historial de Auditoría y Restauración (solo Admin)

### BD y Servidor
- [x] Tabla `auditLog`: id, tableName, recordId, action (create/update/delete), oldData (JSON), newData (JSON), userId, userName, processId, processName, createdAt
- [x] Interceptar todas las operaciones delete en db.ts para guardar snapshot en auditLog antes de borrar
- [x] Endpoint tRPC: admin.audit.list (filtros: tableName, action, processId)
- [x] Endpoint tRPC: admin.audit.restore (restaurar registro desde oldData, solo admin)
- [x] Función restoreAuditRecord: soporte para orgHierarchies, orgCollaborators, kpis, processInteractions, projects

### Pantalla Admin - Historial
- [x] Pantalla `admin-historial.tsx`: lista de eventos de auditoría con filtros
- [x] Filtros: por módulo (Organigrama, Colaboradores, KPIs, Interacciones, Proyectos), por tipo de acción
- [x] Tarjeta de evento: fecha, usuario, módulo, acción, descripción del cambio
- [x] Modal de detalle con snapshot del registro eliminado
- [x] Botón "Restaurar" para registros eliminados (acción delete, no restaurados)
- [x] Confirmación antes de restaurar
- [x] Badge "RESTAURADO" para registros ya recuperados
- [x] Tab "Historial" visible solo para admin/superadmin

## Feature v12 - Auditoría Extendida + Filtros + Exportación

### Auditoría de actualizaciones
- [x] Interceptar updateKPI para guardar oldData/newData en auditLog
- [x] Interceptar updateCollaborator para guardar oldData/newData en auditLog
- [x] Interceptar adminUpdateProject para guardar oldData/newData con diff de cambios
- [x] Interceptar updateInteractionTask para guardar oldData/newData en auditLog

### Filtro por área/líder en historial
- [x] Endpoint audit.list acepta filtro por processName
- [x] Endpoint audit.listProcessNames: lista de áreas/procesos únicos para dropdown
- [x] Pantalla admin-historial.tsx: dropdown/selector de área/líder
- [x] Vista de diff: mostrar campos que cambiaron (anterior → nuevo) para acciones update
- [x] Vista de snapshot para registros eliminados

### Exportación de historial a Excel
- [x] Función getAuditLogsExportData en db.ts
- [x] Endpoint export.auditLog en routers.ts (solo admin)
- [x] Hoja "Historial" en buildExcelWorkbook en excel-export.ts
- [x] Botón "Descargar Historial" en pantalla exportar.tsx (solo admin)

## Feature v13 - Correcciones y Mejoras

### Bug Fix - Acceso Restringido en Historial
- [x] Corregir bug: admin ve "Acceso restringido" en pantalla de Historial (usaba useAuth en vez de useLisRole)
- [x] Auditoría de proyectos: adminUpdateProject ya interceptado con oldData/newData

### Renombrar App y Rediseño Dashboard
- [x] Cambiar nombre de la app a "LIS Leadership" en app.config.ts
- [x] Mejorar header del dashboard: badge Admin rojo para admin no-superadmin, badge rojo para superadmin en modo admin
- [x] Barra de progreso visual (X de 6 módulos completados) - ya implementada
- [x] Tarjetas de módulos con ícono, nombre, descripción y check verde si completado - ya implementadas

### Paginación en Historial
- [x] Mostrar 50 registros por defecto en admin-historial.tsx
- [x] Botón "Cargar más" para cargar siguientes 50 registros
- [x] Contador de registros mostrados vs total

## Feature v14 - Filtro de Fecha en Historial

- [x] Endpoint audit.list acepta filtros dateFrom y dateTo (ISO string)
- [x] Función getAuditLogs en db.ts aplica WHERE createdAt >= dateFrom AND createdAt <= dateTo (fin del día)
- [x] Botón "Desde" en admin-historial.tsx: abre modal de entrada de fecha (AAAA-MM-DD)
- [x] Botón "Hasta" en admin-historial.tsx: abre modal de entrada de fecha (AAAA-MM-DD)
- [x] Validación de formato de fecha con mensaje de error
- [x] Botón "Limpiar" individual por campo y botón "✕ Limpiar" para ambos filtros
- [x] Indicador visual (color azul) cuando hay filtro de fecha activo
- [x] Resetear visibleCount al aplicar o limpiar filtros de fecha

## Feature v15 - Restauración Universal en Historial

- [x] Extender restoreAuditRecord en db.ts: soporte para acción "update" (revertir oldData: kpis, projects, orgCollaborators, interactionTasks)
- [x] Extender restoreAuditRecord en db.ts: soporte para acción "create" (eliminar el registro creado: kpis, projects, orgCollaborators, orgHierarchies, processInteractions)
- [x] DetailModal en admin-historial.tsx: botón Restaurar visible para delete, update y create (no restaurados)
- [x] Etiquetas diferenciadas: "Recrear registro" (delete), "Revertir cambio" (update), "Deshacer creación" (create)
- [x] Descripción en amarillo antes del botón explicando qué hará la acción
- [x] Confirmación diferenciada en Alert.alert según el tipo de acción
- [x] Borde de tarjeta en color de acción para registros no restaurados (todos los tipos)

## Feature v16 - Permisos y Visualizaciones por Perfil

### Organigrama Visual
- [x] Corregir detección de rol: usar useLisRole() en vez de (user as any)?.role === "admin"
- [x] Admin/superadmin ven todos los organigramas de todos los procesos graficados juntos
- [x] User solo ve el organigrama de su propio proceso

### Módulo Proyectos
- [x] User: usa trpc.project.list (solo sus proyectos, filtrado por processId)
- [x] Admin/superadmin: usa trpc.admin.getAllProjects (todos los proyectos de todos los procesos)
- [x] Bifurcación de query según rol con useLisRole()

### Módulo Progreso
- [x] Agregar función getUserProgress en db.ts (progreso individual del usuario)
- [x] Agregar endpoint progress.myProgress en routers.ts
- [x] User ve "Mi Progreso": tarjetas de módulos con estado completado/pendiente
- [x] Admin/superadmin ven "Progreso Consolidado": tabla de todos los líderes
- [x] Tab "Progreso" visible para todos los roles (contenido diferenciado)

### Tabs ocultos para user
- [x] Tab "Exportar": oculto para user (href: null), visible solo para admin/superadmin
- [x] Tab "Usuarios": ya estaba oculto para user (correcto)
- [x] Tab "Historial": ya estaba oculto para user (correcto)
- [x] Tab "Proy. Admin": ya estaba oculto para user (correcto)

### Exportar
- [x] Corregir detección de rol en exportar.tsx: usar useLisRole() en vez de useAuth()
- [x] isAdmin ahora detecta correctamente admin y superadmin de la tabla LIS

### Validación de código
- [x] organigrama-visual.tsx: useLisRole() ✓
- [x] proyectos.tsx: useLisRole() ✓
- [x] admin-progreso.tsx: useLisRole() + bifurcación de vista ✓
- [x] exportar.tsx: useLisRole() ✓
- [x] admin-historial.tsx: useLisRole() ✓
- [x] admin-usuarios.tsx: protegido por tab layout (href: isAdmin ? undefined : null) ✓
- [x] TypeScript: 0 errores ✓
- [x] Fix timing: no renderizar <Tabs> hasta que lisRole !== null (evita que href:null se evalúe con rol null)
- [x] key={`tabs-${lisRole}`} en <Tabs> para forzar remontaje si el rol cambia
- [x] Tests unitarios de permisos: 9/9 passing en tests/permissions.test.ts

## Bug fixes v17 - Tabs y Progreso (sesión 3)
- [x] Reemplazar href:null con CustomTabBar reactivo que filtra tabs según lisRole en tiempo real
- [x] Tabs Exportar, Usuarios, Admin Proyectos, Historial: ocultos para perfil user via CustomTabBar
- [x] admin-progreso.tsx: corregir enabled en getConsolidatedProgress (era { enabled: isAdmin } como input, ahora es opción de query)
- [x] admin-progreso.tsx: agregar guard lisRole === null para evitar flicker de vista consolidada antes de resolver rol
- [x] TypeScript: 0 errores
- [x] Tests: 18/18 passing

## Feature v18 - Permisos definitivos y filtros por proceso

### Tabs ocultos para USER
- [ ] Verificar que CustomTabBar oculta correctamente: Exportar, Usuarios, Admin Proyectos, Historial para perfil USER
- [ ] Confirmar que ADMIN y SUPERADMIN ven todos los tabs

### Vista Organigrama diferenciada
- [ ] USER: solo ve el organigrama de su propio proceso
- [ ] ADMIN/SUPERADMIN: ven todos los organigramas separados por área
- [ ] ADMIN/SUPERADMIN: opción de vista integrada (todos los niveles juntos en un solo organigrama)

### Filtro por proceso para ADMIN/SUPERADMIN
- [ ] KPIs: USER ve solo los suyos; ADMIN/SUPERADMIN ven todos con selector de proceso
- [ ] DOFA: USER ve solo el suyo; ADMIN/SUPERADMIN ven todos con selector de proceso
- [ ] Interacciones: USER ve solo las suyas; ADMIN/SUPERADMIN ven todas con selector de proceso
- [ ] Proyectos: USER ve solo los suyos; ADMIN/SUPERADMIN ven todos con selector de proceso
- [ ] Progreso Consolidado: ya tiene vista diferenciada, agregar filtro por proceso en vista admin

## Feature v18 - Permisos definitivos por rol (sesión 4)
- [x] Tabs Exportar, Usuarios, Proy. Admin, Historial: ocultos para USER via CustomTabBar reactivo
- [x] _layout.tsx: lisRole resuelto completamente ANTES de montar Tabs (no hay flicker)
- [x] Vista Organigrama: USER solo ve el suyo; ADMIN/SUPERADMIN ven todos por proceso
- [x] Vista Organigrama admin: toggle "Por Proceso" / "Por Nivel" (vista integrada por niveles)
- [x] KPIs: USER solo ve los suyos; ADMIN/SUPERADMIN ven todos con filtro por proceso
- [x] DOFA: USER solo ve los suyos; ADMIN/SUPERADMIN ven todos con filtro por proceso
- [x] Interacciones: USER solo ve las suyas; ADMIN/SUPERADMIN ven todas con filtro por proceso
- [x] Proyectos: USER solo ve los suyos; ADMIN/SUPERADMIN ven todos con filtro por proceso
- [x] Progreso Consolidado: USER solo ve el suyo; ADMIN/SUPERADMIN ven todos con filtro por area/lider
- [x] TypeScript: 0 errores
- [x] Tests: 18/18 passing

## Ajustes v19 - Interfaz y Funcionalidad (9 ajustes)
- [x] Ajuste 1: SuperAdmin respeta perfil seleccionado (navegar como User = visual/permisos de User)
- [x] Ajuste 2: Quitar tabs admin de barra inferior; agregar menú hamburguesa en header para admin/superadmin
- [ ] Ajuste 3: Teclado no tapa formularios (KeyboardAvoidingView en todos los modales/formularios)
- [ ] Ajuste 4: Botones Android (barra inferior del sistema) no tapan contenido de la app
- [ ] Ajuste 5: Editar/eliminar en todos los módulos para user y superadmin
- [ ] Ajuste 6: Organigrama admin integrado con filtro por proceso (corregir vista actual)
- [ ] Ajuste 8: Interacciones del proceso - agregar opción de editar registros existentes
- [ ] Ajuste 9: Progreso e Inicio se actualizan en tiempo real sin cerrar sesión

## Ajuste 5 — Editar/Eliminar en todos los módulos
- [x] Organigrama: botón editar nombre de jerarquía (endpoint hierarchy.update existe)
- [x] Organigrama: botón editar datos de colaborador (nombre, cargo) (endpoint collaborator.update existe)
- [x] Organigrama: botón editar descripción de función de colaborador (endpoint collaboratorFunction.update existe)
- [x] Interacciones: botón editar tarea ya creada (endpoint interactionTask.update existe)
- [x] Interacciones: botón editar fortaleza/oportunidad (endpoint interactionStrength.update agregado)

## Ajustes pendientes v20

- [x] Ajuste 3: Teclado no tapa formularios (KeyboardAvoidingView en todos los modales)
- [x] Ajuste 4: Barra inferior Android no tapa contenido de la app
- [x] Ajuste 6: Organigrama admin — filtro por proceso funcional
- [x] Ajuste 10: Exportar reporte — procesos aparecen como "Sin nombre" en modo Todos y Seleccionar
- [x] Ajuste 11: Vista Organigrama admin (superadmin) no muestra organigramas de otros procesos (aparece "Sin procesos registrados")

## Ajustes pendientes v21

- [x] Ajuste 5: Bug Fix Login — app queda atascada en "Iniciando sesión..." sin redirigir; agregar timeout/fallback de 3s
- [x] Ajuste 8: Interacciones — editar interacción completa (proceso proveedor/cliente, tipo interacción)
- [x] Ajuste 9: Inicio y Progreso se actualizan en tiempo real (refetchInterval o invalidateQueries al completar módulos)

## Bug Fix v22

- [x] Bug 1: Historial no registra cambios de los nuevos endpoints de editar (organigrama, interacciones, interacción principal)
- [x] Bug 2: Proyectos — error "No values to set" al actualizar (Drizzle falla con campos undefined en SET)
- [x] Bug 3: Organigrama admin (Vista Org.) — falta botón mostrar/ocultar funciones de colaboradores

## Ajustes v23 — Validación BD y Mejoras

- [x] Validación: verificar conexión y estructura completa de la base de datos (tablas, migraciones, datos)
- [x] Ajuste A: Agregar writeAuditLog en upsertDOFA para trazabilidad de cambios en la matriz DOFA
- [x] Ajuste B: Incluir funciones de colaboradores en la hoja de organigrama del Excel exportado (ya implementado, validado)
- [x] Ajuste C: Agregar opciones de filtro en historial para módulos nuevos (dofaMatrix, collaboratorFunctions, interactionStrengths)

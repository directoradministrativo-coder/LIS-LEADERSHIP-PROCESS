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

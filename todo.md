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

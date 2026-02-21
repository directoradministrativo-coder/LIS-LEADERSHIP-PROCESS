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

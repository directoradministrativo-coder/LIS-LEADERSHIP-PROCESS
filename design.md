# Diseño de Aplicación Móvil - LIS Process Survey

## Identidad Visual

La aplicación adopta la identidad corporativa de Logística Inteligente Solution con los siguientes parámetros de diseño:

**Paleta de Colores Corporativos:**
- Rojo LIS: `#CC2229` (color principal del logo)
- Azul LIS: `#1B4F9B` (color secundario del logo)
- Amarillo LIS: `#F5A623` (color de acento del logo)
- Verde LIS: `#5CB85C` (color de acento del logo)
- Gris corporativo: `#6B7280` (textos secundarios)
- Blanco: `#FFFFFF` (fondos)
- Gris claro: `#F8F9FA` (superficies/cards)

**Tipografía:** Sans-serif moderna, limpia y profesional (Inter/Roboto)

---

## Lista de Pantallas

### 1. Pantalla de Login
Autenticación del líder de área con credenciales corporativas. Muestra el logo LIS prominente, campo de usuario/área y contraseña.

### 2. Dashboard Principal
Vista general del proceso del usuario con el nombre del proceso, progreso de cada sección (Organigrama, KPIs, DOFA, Proveedores, Clientes) y acceso rápido a cada módulo.

### 3. Módulo 1 - Nombre del Proceso
Campo de texto para ingresar el nombre del proceso del área.

### 4. Módulo 1.1 - Organigrama del Área
Visualización interactiva del organigrama con jerarquías (Director, Gerente, Jefe, Líder, Coordinador, Analista, Auxiliar). Botones para agregar, modificar y eliminar colaboradores. Funcionalidad de exportar a Excel.

### 5. Módulo 2 - KPIs del Proceso
Formulario para registrar KPIs con campos: Nombre, Objetivo, Frecuencia, Fórmula y Responsable. Lista de KPIs registrados con opción de descarga en Excel.

### 6. Módulo 3 - DOFA
Matriz DOFA interactiva con cuatro cuadrantes (Debilidades, Oportunidades, Fortalezas, Amenazas). Link de ayuda contextual. Exportación a Excel.

### 7. Módulo 4 - Proveedores del Proceso
Formulario para registrar procesos proveedores con tareas, documentos, responsables y ANS. Sección de fortalezas y oportunidades por proveedor.

### 8. Módulo 5 - Clientes del Proceso
Formulario para registrar procesos clientes con tareas, documentos, responsables y ANS. Sección de fortalezas y oportunidades por cliente.

### 9. Pantalla de Reportes
Acceso centralizado a todos los reportes descargables en Excel.

---

## Flujos de Usuario Principales

**Flujo de Autenticación:**
Login → Validación de credenciales → Dashboard Principal

**Flujo de Levantamiento de Proceso:**
Dashboard → Nombre del Proceso → Organigrama → KPIs → DOFA → Proveedores → Clientes → Reportes

**Flujo de Organigrama:**
Seleccionar jerarquía → Agregar colaborador → Ingresar funciones → Visualizar organigrama → Exportar Excel

**Flujo de KPIs:**
Ingresar KPI (5 campos obligatorios) → Guardar → Ver tabla de KPIs → Exportar Excel

**Flujo de Proveedores/Clientes:**
Seleccionar proceso → Agregar tarea → Definir ANS → Calificar cumplimiento → Fortalezas → Oportunidades

---

## Diseño de Componentes

**Header:** Logo LIS + nombre del proceso + indicador de progreso
**Navegación:** Tab bar inferior con 5 secciones principales
**Cards:** Esquinas redondeadas (12px), sombra suave, borde gris claro
**Botones primarios:** Fondo rojo LIS (#CC2229), texto blanco, esquinas redondeadas
**Botones secundarios:** Borde rojo LIS, texto rojo, fondo transparente
**Inputs:** Borde gris, foco en azul LIS, esquinas redondeadas
**Badges/Tags:** Colores corporativos según estado

---

## Estructura de Navegación

La app usa navegación por tabs en la parte inferior con las siguientes secciones:
1. Inicio (Dashboard)
2. Organigrama
3. KPIs
4. DOFA
5. Más (Proveedores, Clientes, Reportes)

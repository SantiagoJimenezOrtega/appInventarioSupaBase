# Guía de Contexto del Proyecto: Sistema AgroInv

Este documento sirve como referencia rápida para cualquier IA que trabaje en este proyecto en futuras sesiones. Contiene la arquitectura, configuración, convenciones y estado actual del sistema.

---

## 🚀 Descripción General
**Sistema AgroInv** es una aplicación de gestión de inventarios diseñada para el sector agropecuario, construida con un stack moderno enfocado en la velocidad y la escalabilidad.

## 🛠 Stack Tecnológico
- **Frontend**: Next.js 15 (App Router), React 19.
- **Estilos**: Tailwind CSS 4, Shadcn/UI (Tema Verde/Amarillo Vibrante).
- **Backend / Base de Datos**: Supabase (PostgreSQL).
- **Gestión de Estado**: TanStack Query (React Query) para sincronización con el servidor.
- **Formularios**: React Hook Form + Zod.
- **Iconos**: Lucide React.
- **AI**: Genkit AI + Google Gemini API.

---

## 📂 Estructura del Proyecto

```text
/src
 ├── /app
 │    ├── /(app)         # Rutas protegidas (Dashboard, Productos, etc.)
 │    ├── /api           # Endpoints de la API (Next.js Route Handlers)
 │    └── /login         # Página de autenticación
 ├── /components         # Componentes UI (Shadcn y personalizados)
 ├── /contexts           # Contextos de React (AuthContext)
 ├── /hooks              # Hooks personalizados (especialmente use-api.ts)
 ├── /lib                # Utilidades, tipos y lógica de negocio (FIFO)
 └── /ai                 # Flujos de Genkit AI
```

---

## 🗄️ Arquitectura de Datos (Supabase)

### Tablas Principales:
1.  **`products`**: Catálogo de productos con precios de compra (referencia) y venta.
2.  **`branches`**: Sucursales o sedes físicas del negocio.
3.  **`providers`**: Proveedores de mercancía.
4.  **`stock_movements`**: Registro de ingresos (`inflow`), egresos (`outflow`), transferencias y conversiones. Soporta números de remisión para agrupar movimientos.
5.  **`payable_invoices`**: Facturas por pagar a proveedores, vinculadas a movimientos de stock por `remission_number`.
6.  **`inventory_counts`**: Registros de conteos físicos para auditoría y ajustes de stock.

---

## 🔑 Convenciones Críticas

### 1. Comunicación con la Base de Datos
- **NO** llamar a Supabase directamente desde los componentes.
- **SIEMPRE** usar los hooks definidos en `src/hooks/use-api.ts`.
- Los hooks de `use-api.ts` llaman a los endpoints de `/api/*`, los cuales ejecutan la lógica de Supabase en el servidor.

### 2. Estilos y UI
- Usar componentes de **Shadcn/UI** para mantener la consistencia.
- El esquema de colores debe ser premium: fondos oscuros, acentos en verde esmeralda y amarillo vibrante.

### 3. Lógica de Inventario
- El sistema utiliza lógica **FIFO** para la valoración de inventarios (ubicada parcialmente en `src/lib/mock-data.ts` y lógica de movimientos).
- Los números de remisión (`remission_number`) son la clave para agrupar múltiples productos en una sola transacción.

---

## ⚙️ Configuración y Variables de Entorno

Archivo `.env` o `.env.local` requerido:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
GOOGLE_AI_API_KEY=tu_gemini_api_key
```

### Acceso de Prueba:
- **Usuario**: `admin@agroinsumos.com`
- **Password**: `Admin12345.`
*(Nota: El sistema usa actualmente un mock de autenticación en `AuthContext`)*

---

## ✅ Estado del Proyecto (Enero 2026)
- [x] CRUD completo de Entidades (Productos, Sucursales, Proveedores).
- [x] Gestión de Movimientos de Stock (Ingresos/Egresos).
- [x] Sistema de Remisiones (Crear, Editar, Eliminar grupos de movimientos).
- [x] Módulo de Conteos de Inventario (Comparación teórica vs física).
- [x] Dashboard con visualizaciones básicas.
- [ ] Implementación profunda de AI para análisis predictivo (en proceso).
- [ ] Refinamiento total de la valoración FIFO real en base de datos.

---

*Este archivo debe actualizarse al final de cada sesión significativa para mantener la coherencia.*

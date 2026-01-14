# Sistema AgroInv

## Setup Instructions

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env.local` file in the root directory with the following keys:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    GOOGLE_AI_API_KEY=your_gemini_api_key
    ```

3.  **Supabase Setup**:
    -   Create a new Supabase project.
    -   Go to the SQL Editor.
    -   Run the contents of `schema.sql` (found in the root of this project).
    -   This will create the necessary tables: `products`, `branches`, `providers`, `stock_movements`, `payable_invoices`, `invoice_payments`, `inventory_counts`, `inventory_count_items`.

4.  **Run the App**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

5.  **Login**:
    -   User: `admin@agroinsumos.com`
    -   Password: `Admin12345.`

## Tech Stack
-   **Framework**: Next.js 15 + React 18/19
-   **Styling**: Tailwind CSS 4 + Shadcn UI (Vibrant Green/Yellow Theme)
-   **Database**: Supabase (PostgreSQL)
-   **Icons**: Lucide React
-   **AI**: Genkit + Google AI

## Folder Structure
-   `src/app/(app)`: Protected Application Routes (Dashboard, Products, etc.)
-   `src/app/api`: API Routes (Stock Movements, etc.)
-   `src/components`: UI Components
-   `src/lib`: Utilities, Types, Supabase Client, FIFO Logic
-   `src/contexts`: Auth Context
-   `src/ai`: Genkit AI Flows

## Features Implemented
-   [x] Project Setup & Architecture
-   [x] Supabase Integration (Schema & Client)
-   [x] Auth System (Hardcoded Mock)
-   [x] Protected Layout & Sidebar
-   [x] Dashboard UI (Mockup)
-   [x] Stock Movements API (Core Logic)
-   [x] FIFO Valuation Logic (`src/lib/mock-data.ts`)
-   [x] AI Integration Setup

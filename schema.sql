-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Products
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price numeric not null, -- Selling price
  purchase_price numeric, -- Reference purchase price
  created_at timestamp with time zone default now()
);

-- Branches
create table branches (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location text,
  encargado text,
  created_at timestamp with time zone default now()
);

-- Providers
create table providers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_person text,
  contact_number text,
  created_at timestamp with time zone default now()
);

-- Stock Movements
create table stock_movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id),
  product_name text, -- Denormalized for easier querying/snapshot
  branch_id uuid references branches(id),
  branch_name text, -- Denormalized
  type text check (type in ('inflow', 'outflow', 'transfer', 'conversion')),
  quantity numeric not null,
  date timestamp with time zone not null,
  price_at_transaction numeric,
  remission_number text, -- Critical for grouping
  provider_id uuid references providers(id),
  provider_name text, -- Denormalized
  comment text,
  created_at timestamp with time zone default now(),
  index_in_transaction integer -- For ordering within a batch
);

-- Payable Invoices
create table payable_invoices (
  id uuid primary key default uuid_generate_v4(),
  remission_number text not null, -- Links to movements
  date timestamp with time zone not null,
  provider_id uuid references providers(id),
  provider_name text,
  total_amount numeric not null,
  payment_status text default 'Pendiente', -- Calculated usually, but good to store cache
  due_date timestamp with time zone,
  iva numeric default 0,
  retefuente numeric default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Invoice Payments
create table invoice_payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references payable_invoices(id) on delete cascade,
  amount numeric not null,
  date timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Inventory Counts
create table inventory_counts (
  id uuid primary key default uuid_generate_v4(),
  date timestamp with time zone not null,
  branch_id uuid references branches(id),
  branch_name text,
  responsible text,
  status text check (status in ('en progreso', 'completado')),
  notes text,
  adjustments_applied boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Inventory Count Items
create table inventory_count_items (
  id uuid primary key default uuid_generate_v4(),
  count_id uuid references inventory_counts(id) on delete cascade,
  product_id uuid references products(id),
  product_name text,
  initial_quantity numeric default 0,
  inflow_quantity numeric default 0,
  outflow_quantity numeric default 0,
  theoretical_quantity numeric,
  physical_quantity numeric,
  difference numeric
);

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. AGENCIES (e.g. Regions/Cities)
create table agencies (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    location text,
    created_at timestamptz default now()
);

-- 2. STORES (Magasins within an Agency)
create table stores (
    id uuid default uuid_generate_v4() primary key,
    agency_id uuid references agencies(id) on delete cascade,
    name text not null, -- e.g. "Magasin A", "Magasin B"
    created_at timestamptz default now()
);

-- 3. USERS (Extended Profile for App Users)
-- We use a separate table from auth.users for app-specific data, 
-- or we can assume this IS the user table if no Auth provider is used yet.
-- Given the requirement "Login for each Magasinier", simple custom auth table is often easiest for internal tools if Supabase Auth isn't strictly enforced.
create table app_users (
    id uuid default uuid_generate_v4() primary key,
    username text unique not null,
    password_hash text not null, -- simple fix for now, ideally use proper auth
    full_name text not null,
    role text check (role in ('admin', 'manager', 'magasinier', 'vendeur')) not null,
    default_agency_id uuid references agencies(id), -- Auto-select this agency on login
    default_store_id uuid references stores(id),    -- Auto-select this store on login
    created_at timestamptz default now()
);

-- 4. PRODUCTS (Per Agency or Global? Prompt says "Agences n'ont pas les memes produits")
-- So products are defined per Agency.
create table products (
    id uuid default uuid_generate_v4() primary key,
    agency_id uuid references agencies(id) on delete cascade, -- Product belongs to an agency catalog
    name text not null,
    unit_label text not null, -- "Sac 25kg"
    base_price numeric not null,
    created_at timestamptz default now()
);

-- 5. STOCK MOVEMENTS (The core of the "Fiche de Stock")
create table stock_movements (
    id uuid default uuid_generate_v4() primary key,
    store_id uuid references stores(id) on delete cascade,
    product_id uuid references products(id) on delete cascade,
    user_id uuid references app_users(id), -- Who did the operation
    movement_type text check (movement_type in ('ENTRY', 'EXIT', 'RETURN', 'ADJUSTMENT')) not null,
    quantity numeric not null, -- Positive value. Logic determines +/- based on type.
    reference_doc text, -- "N° FACTURE" or "NOM"
    date_movement date default current_date not null,
    created_at timestamptz default now()
);

-- 6. CURRENT STOCK (Materialized View or Real Table for speed)
-- For simplicity and data integrity, we can calculate on fly or update a counter.
-- Let's use a simple counter table updated via triggers or application logic.
create table stock_levels (
    store_id uuid references stores(id) on delete cascade,
    product_id uuid references products(id) on delete cascade,
    current_quantity numeric default 0 not null,
    primary key (store_id, product_id)
);

-- Row Level Security (Open for now as per previous pattern)
alter table agencies enable row level security;
alter table stores enable row level security;
alter table app_users enable row level security;
alter table products enable row level security;
alter table stock_movements enable row level security;
alter table stock_levels enable row level security;

create policy "Public Access Agencies" on agencies for all using (true) with check (true);
create policy "Public Access Stores" on stores for all using (true) with check (true);
create policy "Public Access App Users" on app_users for all using (true) with check (true);
create policy "Public Access Products" on products for all using (true) with check (true);
create policy "Public Access Stock Movements" on stock_movements for all using (true) with check (true);
create policy "Public Access Stock Levels" on stock_levels for all using (true) with check (true);

-- Create Employees Table
create table employees (
  id text primary key,
  name text not null,
  role text not null,
  created_at timestamptz default now()
);

-- Create Products Table
create table products (
  id text primary key,
  name text not null,
  "unitLabel" text not null,
  "basePrice" numeric not null,
  created_at timestamptz default now()
);

-- Create Sales Table
create table sales (
  id text primary key,
  "employeeId" text references employees(id),
  "productId" text references products(id),
  quantity numeric not null,
  "unitPrice" numeric not null,
  total numeric not null,
  "createdAt" timestamptz default now()
);

-- Enable Row Level Security (Good practice)
alter table employees enable row level security;
alter table products enable row level security;
alter table sales enable row level security;

-- Create policies to allow public read/write (since auth isn't mentioned, we'll open it up for the "share link" requirement)
create policy "Public Access Employees" on employees for all using (true) with check (true);
create policy "Public Access Products" on products for all using (true) with check (true);
create policy "Public Access Sales" on sales for all using (true) with check (true);

-- ============================================================
-- Warehouse ERP — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Products ─────────────────────────────────────────────────

create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  sku          text unique not null,
  category     text not null default 'General',
  unit         text not null default 'pcs',
  current_stock integer not null default 0,
  min_stock    integer not null default 0,
  created_at   timestamptz default now()
);

-- ── Serial number sequences ───────────────────────────────────

create sequence if not exists stock_tx_seq  start 1 increment 1;
create sequence if not exists units_sold_seq start 1 increment 1;

-- ── Stock Transactions ────────────────────────────────────────

create table if not exists stock_transactions (
  id                uuid primary key default gen_random_uuid(),
  serial_no         text unique,               -- auto-set by trigger
  product_id        uuid references products(id) on delete cascade not null,
  type              text check (type in ('in', 'out')) not null,
  quantity          integer not null check (quantity > 0),
  notes             text default '',
  reference         text default '',
  installation_date text default '',
  location          text default '',
  assigned_to       text default '',
  created_at        timestamptz default now()
);

create index if not exists idx_stock_tx_product on stock_transactions(product_id);
create index if not exists idx_stock_tx_created on stock_transactions(created_at desc);

-- ── Units Sold ────────────────────────────────────────────────

create table if not exists units_sold (
  id                uuid primary key default gen_random_uuid(),
  serial_no         text unique,               -- auto-set by trigger
  product_id        uuid references products(id) on delete cascade not null,
  product_name      text not null,
  sku               text not null,
  transaction_id    text default '',
  unit_number       integer not null default 1,
  total_units       integer not null default 1,
  reference         text default '',
  installation_date text default '',
  location          text default '',
  assigned_to       text default '',
  notes             text default '',
  warranty_months   integer not null default 12,
  status            text check (status in ('active','returned','maintenance')) default 'active',
  created_at        timestamptz default now()
);

create index if not exists idx_units_product    on units_sold(product_id);
create index if not exists idx_units_serial     on units_sold(serial_no);
create index if not exists idx_units_created    on units_sold(created_at desc);

-- ── Auto-generate serial_no on insert ────────────────────────

create or replace function set_stock_tx_serial()
returns trigger language plpgsql as $$
begin
  new.serial_no := concat(
    case when new.type = 'in' then 'SI' else 'SO' end,
    '-',
    to_char(now() at time zone 'utc', 'YYYYMMDD'),
    '-',
    lpad(nextval('stock_tx_seq')::text, 5, '0')
  );
  return new;
end;
$$;

drop trigger if exists trg_stock_tx_serial on stock_transactions;
create trigger trg_stock_tx_serial
  before insert on stock_transactions
  for each row execute function set_stock_tx_serial();

-- ──

create or replace function set_unit_sold_serial()
returns trigger language plpgsql as $$
begin
  new.serial_no := concat(
    'US-',
    to_char(now() at time zone 'utc', 'YYYYMMDD'),
    '-',
    lpad(nextval('units_sold_seq')::text, 5, '0')
  );
  return new;
end;
$$;

drop trigger if exists trg_unit_sold_serial on units_sold;
create trigger trg_unit_sold_serial
  before insert on units_sold
  for each row execute function set_unit_sold_serial();

-- ── Auto-update current_stock on transaction insert ───────────

create or replace function update_product_stock()
returns trigger language plpgsql as $$
begin
  if new.type = 'in' then
    update products set current_stock = current_stock + new.quantity where id = new.product_id;
  else
    update products set current_stock = current_stock - new.quantity where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_update_stock on stock_transactions;
create trigger trg_update_stock
  after insert on stock_transactions
  for each row execute function update_product_stock();

-- ── Row-Level Security (allow all for anon key) ───────────────

alter table products          enable row level security;
alter table stock_transactions enable row level security;
alter table units_sold         enable row level security;

create policy "allow all products"      on products          for all using (true) with check (true);
create policy "allow all transactions"  on stock_transactions for all using (true) with check (true);
create policy "allow all units"         on units_sold         for all using (true) with check (true);

-- ── Sample data ───────────────────────────────────────────────

insert into products (name, sku, category, unit, current_stock, min_stock) values
  ('Laptop Dell XPS 15',    'LPT-001', 'Electronics', 'pcs',  25,  5),
  ('Office Chair Ergonomic','FRN-001', 'Furniture',   'pcs',  40,  10),
  ('A4 Paper Ream',         'STT-001', 'Stationery',  'ream', 200, 50),
  ('USB-C Hub 7-in-1',      'ACC-001', 'Accessories', 'pcs',  60,  15),
  ('Monitor 27" 4K',        'MON-001', 'Electronics', 'pcs',  4,   5)
on conflict (sku) do nothing;

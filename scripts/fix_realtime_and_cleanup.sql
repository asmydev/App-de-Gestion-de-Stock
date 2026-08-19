
-- 1. Enable Realtime for the stock_movements table
-- This is required for the Admin Dashboard to update automatically.
begin;
  -- Check if publication exists (default in Supabase), if not create it (rarely needed)
  -- alter publication supabase_realtime add table stock_movements;
  
  -- We'll try to add it. If it's already there, no harm usually, or we can drop and re-add.
  -- Safest way often is just:
  alter publication supabase_realtime add table stock_movements;
  alter publication supabase_realtime add table products; 
  alter publication supabase_realtime add table stores;
  
  -- 2. Force Delete "Siège" Agency (Case Insensitive)
  -- This will cascade to stores and products if cascade is set up, otherwise might fail if not.
  -- Our schema was: on delete cascade.
  delete from agencies 
  where name ilike '%Siège%' 
     or name ilike '%Siege%'
     or name = 'Siège';

commit;

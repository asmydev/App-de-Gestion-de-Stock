import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manually parse .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixData() {
    console.log("=== FIXING DATA RELATIONSHIPS ===\n");

    // Get all stores
    const { data: stores } = await supabase.from('stores').select('*');
    console.log("Stores found:", stores?.length || 0);

    // Get all agencies
    const { data: agencies } = await supabase.from('agencies').select('*');
    console.log("Agencies found:", agencies?.length || 0);

    // Find agency named 'Maroua' or similar
    const marouaAgency = agencies?.find(a => a.name.toLowerCase().includes('maroua'));
    console.log("\nMaroua Agency:", marouaAgency);

    if (!marouaAgency) {
        console.log("No Maroua agency found!");
        return;
    }

    // Find stores without agencyId and assign to Maroua
    const storesWithoutAgency = stores?.filter(s => !s.agency_id) || [];
    console.log(`\nStores without agency_id: ${storesWithoutAgency.length}`);

    for (const store of storesWithoutAgency) {
        console.log(`  Updating store: ${store.name} with Maroua agency ID...`);
        const { error } = await supabase
            .from('stores')
            .update({ agency_id: marouaAgency.id })
            .eq('id', store.id);
        if (error) {
            console.error(`  Error updating store ${store.name}:`, error);
        } else {
            console.log(`  ✓ Store ${store.name} updated successfully`);
        }
    }

    // Get movements and check store_id
    const { data: movements } = await supabase.from('stock_movements').select('*');
    console.log(`\nMovements found: ${movements?.length || 0}`);

    // Find first store to use for orphan movements
    const firstStore = stores?.[0];
    if (!firstStore) {
        console.log("No stores found to assign movements to!");
        return;
    }

    console.log(`Using store "${firstStore.name}" (ID: ${firstStore.id}) for orphan movements`);

    const movementsWithoutStore = movements?.filter(m => !m.store_id) || [];
    console.log(`Movements without store_id: ${movementsWithoutStore.length}`);

    for (const movement of movementsWithoutStore) {
        console.log(`  Updating movement ${movement.id.slice(0, 8)}... with store ID...`);
        const { error } = await supabase
            .from('stock_movements')
            .update({ store_id: firstStore.id })
            .eq('id', movement.id);
        if (error) {
            console.error(`  Error updating movement:`, error);
        } else {
            console.log(`  ✓ Movement updated successfully`);
        }
    }

    console.log("\n=== DONE ===");
}

fixData();

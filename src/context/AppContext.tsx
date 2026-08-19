
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { Product, StockMovement, StockLevel, Employee, SaleLine } from "@/types";

// Re-export types for convenience if needed by consumers
export type { Employee, SaleLine, Product, StockMovement, StockLevel };

interface AppContextType {
    products: Product[];
    movements: StockMovement[];
    stockLevels: StockLevel[];
    employees: Employee[];
    sales: SaleLine[]; // Derived from movements (EXITs)
    isLoading: boolean;

    // Actions
    fetchData: () => Promise<void>;
    addProduct: (product: Omit<Product, 'id' | 'agencyId'>) => Promise<void>;
    updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;

    recordMovement: (movement: Omit<StockMovement, 'id' | 'createdAt' | 'userId' | 'storeId'>) => Promise<void>;
    deleteMovement: (id: string) => Promise<void>;

    // Legacy support aliases for Sales view
    addSale: (sale: Omit<SaleLine, 'id' | 'createdAt'>) => Promise<void>;
    cancelSale: (id: string) => Promise<void>;
    resetSales: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const { user, selectedAgency, selectedStore } = useAuth();

    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (selectedAgency && selectedStore) {
            fetchData();
        } else {
            setProducts([]);
            setMovements([]);
            setStockLevels([]);
            setEmployees([]);
        }
    }, [selectedAgency, selectedStore]);

    const fetchData = async () => {
        if (!selectedAgency || !selectedStore) return;
        setIsLoading(true);
        try {
            // 1. Fetch Products
            const { data: prodData, error: prodError } = await supabase
                .from('products')
                .select('*')
                .eq('agency_id', selectedAgency.id);
            if (prodError) throw prodError;

            const mappedProducts: Product[] = (prodData || []).map((p: any) => ({
                id: p.id,
                agencyId: p.agency_id,
                name: p.name,
                unitLabel: p.unit_label
            }));
            setProducts(mappedProducts);

            // 2. Fetch all Stores in this Agency to get agency-wide movements
            const { data: agencyStores, error: storesError } = await supabase
                .from('stores')
                .select('id')
                .eq('agency_id', selectedAgency.id);
            if (storesError) throw storesError;

            const storeIds = (agencyStores || []).map((s: any) => s.id);

            // 3. Fetch Movements for ALL stores in the agency
            const { data: movData, error: movError } = await supabase
                .from('stock_movements')
                .select('*')
                .in('store_id', storeIds)
                .order('created_at', { ascending: false });
            if (movError) throw movError;

            const mappedMovements: StockMovement[] = (movData || []).map((m: any) => ({
                id: m.id,
                storeId: m.store_id,
                productId: m.product_id,
                userId: m.user_id,
                movementType: m.movement_type,
                quantity: m.quantity,
                referenceDoc: m.reference_doc,
                dateMovement: m.date_movement,
                createdAt: m.created_at
            }));
            setMovements(mappedMovements);

            // 3. Calculate Stock Levels
            const levels = calculateStockLevels(mappedProducts, mappedMovements);
            setStockLevels(levels);

            // 4. Fetch Employees
            const { data: empData, error: empError } = await supabase
                .from('employees')
                .select('*')
                .eq('agency_id', selectedAgency.id);

            // If table doesn't exist or error, just set empty to avoid crash
            if (empError) {
                console.warn("Employees fetch error (might not exist yet):", empError);
                setEmployees([]);
            } else {
                setEmployees((empData || []).map((e: any) => ({
                    id: e.id,
                    name: e.name,
                    role: e.role,
                    agency_id: e.agency_id
                })));
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Erreur de chargement des données");
        } finally {
            setIsLoading(false);
        }
    };

    const calculateStockLevels = (prods: Product[], movs: StockMovement[]): StockLevel[] => {
        const levels: Record<string, number> = {};
        prods.forEach(p => levels[p.id] = 0);

        movs.forEach(m => {
            if (levels[m.productId] === undefined) levels[m.productId] = 0;
            if (m.movementType === 'ENTRY' || m.movementType === 'RETURN') {
                levels[m.productId] += Number(m.quantity);
            } else if (m.movementType === 'EXIT') {
                levels[m.productId] -= Number(m.quantity);
            } else {
                levels[m.productId] -= Number(m.quantity);
            }
        });

        return Object.entries(levels).map(([pid, qty]) => ({
            storeId: selectedStore?.id || '',
            productId: pid,
            currentQuantity: qty
        }));
    };

    // Derived Sales from Movements (EXITs)
    // We assume reference_doc contains the employeeId or we join.
    // Since we don't have a direct link in the simplified schema, we'll try to parse reference_doc 
    // OR just use a workaround if the user didn't specify schema. 
    // Assumption: For "Sale to Personnel", we stored Employee ID in reference_doc?
    // Let's implement addSale to store Employee Name/ID in reference_doc.
    const sales: SaleLine[] = movements
        .filter(m => m.movementType === 'EXIT')
        .map(m => ({
            id: m.id,
            employeeId: m.referenceDoc || 'Unknown', // HACK: We use ref doc for employee ID
            productId: m.productId,
            quantity: m.quantity,
            createdAt: m.createdAt
        }));

    // --- Actions ---

    const addProduct = async (productData: Omit<Product, 'id' | 'agencyId'>) => {
        if (!selectedAgency) return;
        try {
            const dbPayload = {
                agency_id: selectedAgency.id,
                name: productData.name,
                unit_label: productData.unitLabel
                // No base_price
            };
            const { data, error } = await supabase.from('products').insert(dbPayload).select().single();
            if (error) throw error;

            const newProduct: Product = {
                id: data.id,
                agencyId: data.agency_id,
                name: data.name,
                unitLabel: data.unit_label
            };
            setProducts(prev => [...prev, newProduct]);
            toast.success("Produit ajouté");
        } catch (error) {
            console.error(error);
            toast.error("Erreur ajout produit");
        }
    };

    const updateProduct = async (id: string, updates: Partial<Product>) => {
        try {
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.name = updates.name;
            if (updates.unitLabel) dbUpdates.unit_label = updates.unitLabel;

            const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);
            if (error) throw error;

            setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
            toast.success("Produit mis à jour");
        } catch (error) {
            console.error(error);
            toast.error("Erreur mise à jour");
        }
    };

    const deleteProduct = async (id: string) => {
        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            setProducts(prev => prev.filter(p => p.id !== id));
            toast.success("Produit supprimé");
        } catch (error) {
            console.error(error);
            toast.error("Erreur suppression");
        }
    };

    const addEmployee = async (emp: Omit<Employee, 'id'>) => {
        if (!selectedAgency) return;
        try {
            // Basic implementation assuming 'employees' table
            const { data, error } = await supabase.from('employees').insert({
                agency_id: selectedAgency.id,
                name: emp.name,
                role: emp.role
            }).select().single();

            if (error) throw error;

            setEmployees(prev => [...prev, {
                id: data.id,
                name: data.name,
                role: data.role,
                agency_id: data.agency_id
            }]);
            toast.success("Personnel ajouté");
        } catch (error) {
            console.error(error);
            toast.error("Erreur ajout personnel");
        }
    };

    const recordMovement = async (movement: Omit<StockMovement, 'id' | 'createdAt' | 'userId' | 'storeId'>) => {
        if (!selectedStore || !user) return;
        try {
            const dbPayload = {
                store_id: selectedStore.id,
                product_id: movement.productId,
                user_id: user.id,
                movement_type: movement.movementType,
                quantity: movement.quantity,
                reference_doc: movement.referenceDoc,
                date_movement: movement.dateMovement || new Date().toISOString()
            };

            const { data, error } = await supabase.from('stock_movements').insert(dbPayload).select().single();
            if (error) throw error;

            const newMovement: StockMovement = {
                id: data.id,
                storeId: data.store_id,
                productId: data.product_id,
                userId: data.user_id,
                movementType: data.movement_type,
                quantity: data.quantity,
                referenceDoc: data.reference_doc,
                dateMovement: data.date_movement,
                createdAt: data.created_at
            };

            setMovements(prev => [newMovement, ...prev]);

            // Update local stock levels
            setStockLevels(prevLevels => {
                const newLevels = [...prevLevels];
                const index = newLevels.findIndex(l => l.productId === movement.productId);
                const change = (movement.movementType === 'ENTRY' || movement.movementType === 'RETURN')
                    ? Number(movement.quantity)
                    : -Number(movement.quantity);

                if (index >= 0) {
                    newLevels[index] = {
                        ...newLevels[index],
                        currentQuantity: newLevels[index].currentQuantity + change
                    };
                } else {
                    newLevels.push({
                        storeId: selectedStore.id,
                        productId: movement.productId,
                        currentQuantity: change
                    });
                }
                return newLevels;
            });

            toast.success("Mouvement enregistré");
        } catch (error) {
            console.error(error);
            toast.error("Erreur enregistrement mouvement");
        }
    };

    // --- Legacy / Specific Sales Aliases ---

    const addSale = async (sale: Omit<SaleLine, 'id' | 'createdAt'>) => {
        // A Sale is an EXIT movement
        // We store employeeId in referenceDoc
        await recordMovement({
            productId: sale.productId,
            quantity: sale.quantity,
            movementType: 'EXIT',
            referenceDoc: sale.employeeId,
            dateMovement: new Date().toISOString()
        });
    };

    const cancelSale = async (id: string) => {
        // To cancel a sale (exit), we usually delete the movement OR create a RETURN.
        // For simplicity, let's delete it.
        try {
            const { error } = await supabase.from('stock_movements').delete().eq('id', id);
            if (error) throw error;

            setMovements(prev => prev.filter(m => m.id !== id));
            // Recalculate stock levels full refresh or optimistic update?
            // Optimistically: +Quantity
            const canceledMov = movements.find(m => m.id === id);
            if (canceledMov) {
                setStockLevels(prev => {
                    const newLevels = [...prev];
                    const idx = newLevels.findIndex(p => p.productId === canceledMov.productId);
                    if (idx >= 0) {
                        newLevels[idx].currentQuantity += Number(canceledMov.quantity);
                    }
                    return newLevels;
                });
            }
            toast.success("Sortie annulée");
        } catch (error) {
            console.error(error);
            toast.error("Erreur annulation");
        }
    };

    const deleteMovement = async (id: string) => {
        try {
            const movementToDelete = movements.find(m => m.id === id);
            if (!movementToDelete) return;

            const { error } = await supabase.from('stock_movements').delete().eq('id', id);
            if (error) throw error;

            setMovements(prev => prev.filter(m => m.id !== id));

            // Update stock levels: reverse the effect of the deleted movement
            const isEntry = movementToDelete.movementType === 'ENTRY' || movementToDelete.movementType === 'RETURN';
            const adjustment = isEntry ? -Number(movementToDelete.quantity) : Number(movementToDelete.quantity);

            setStockLevels(prev => {
                const newLevels = [...prev];
                const idx = newLevels.findIndex(l => l.productId === movementToDelete.productId);
                if (idx >= 0) {
                    newLevels[idx].currentQuantity += adjustment;
                }
                return newLevels;
            });

            toast.success("Mouvement annulé");
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de l'annulation du mouvement");
        }
    };

    const resetSales = async () => {
        // Delete all EXIT movements for this store?
        // Dangerous, but requested for "Réinitialiser" scenarios in Sales.tsx
        if (!selectedStore) return;
        if (!confirm("Attention: Cela va supprimer tous les mouvements de sortie affichés. Êtes-vous sûr ?")) return;

        try {
            const { error } = await supabase
                .from('stock_movements')
                .delete()
                .eq('store_id', selectedStore.id)
                .eq('movement_type', 'EXIT');

            if (error) throw error;

            // Refresh data
            fetchData();
            toast.success("Ventes réinitialisées");
        } catch (error) {
            console.error(error);
            toast.error("Erreur réinitialisation");
        }
    };

    return (
        <AppContext.Provider
            value={{
                products,
                movements,
                stockLevels,
                employees,
                sales,
                isLoading,
                fetchData,
                addProduct,
                updateProduct,
                deleteProduct,
                addEmployee,
                recordMovement,
                deleteMovement,
                addSale,
                cancelSale,
                resetSales
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useAppStore = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error("useAppStore must be used within an AppProvider");
    }
    return context;
};

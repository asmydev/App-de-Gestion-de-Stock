
import { AppLayout } from "@/components/AppLayout";
import { SaleForm } from "@/components/SaleForm";
import { SalesTable } from "@/components/SalesTable";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/context/AppContext";

const Sales = () => {
    const { sales, products, employees, addSale, cancelSale, resetSales, addEmployee } = useAppStore();

    // Removed totalAmount calculation (Price removal)
    const totalItems = sales.reduce((sum, s) => sum + s.quantity, 0);

    return (
        <AppLayout>
            <div className="space-y-8">
                <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Sorties Stock</h1>
                        <p className="text-muted-foreground">Enregistrez les sorties pour le personnel.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm text-muted-foreground">Total Sorties (Qté)</p>
                            <p className="text-xl font-bold text-primary">{totalItems}</p>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={sales.length === 0}
                            onClick={() => {
                                const ok = window.confirm(
                                    "Voulez-vous vraiment réinitialiser toutes les sorties ? Cette action est irréversible.",
                                );
                                if (ok) resetSales();
                            }}
                        >
                            Réinitialiser
                        </Button>
                    </div>
                </header>

                <div className="flex flex-col gap-8">
                    <div className="space-y-6">
                        <section className="rounded-xl border bg-card p-6 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold">Nouvelle Sortie</h2>
                            <SaleForm
                                onAddSale={addSale}
                                products={products}
                                employees={employees}
                                onAddEmployee={addEmployee}
                            />
                        </section>
                    </div>

                    <div className="min-w-0">
                        <SalesTable sales={sales} employees={employees} products={products} onCancelSale={cancelSale} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default Sales;

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAppStore } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, Plus, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, Trash2, ClipboardCheck, Pencil } from "lucide-react";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { StockMovement } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

export default function StockManagement() {
    const { products, movements, stockLevels, recordMovement, deleteMovement, isLoading } = useAppStore();
    const { selectedStore, user } = useAuth();

    // Form States
    const [isEntryOpen, setIsEntryOpen] = useState(false);
    const [isExitOpen, setIsExitOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [quantity, setQuantity] = useState("");
    const [reference, setReference] = useState("");
    const [dateMovement, setDateMovement] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Filter State
    const [filterProduct, setFilterProduct] = useState("all");
    const [filterDateStart, setFilterDateStart] = useState("");
    const [filterDateEnd, setFilterDateEnd] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Inventory Adjustment State
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [inventoryProductId, setInventoryProductId] = useState("");
    const [inventoryQuantity, setInventoryQuantity] = useState("");

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [movementToDelete, setMovementToDelete] = useState<string | null>(null);

    // Edit Movement State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingMovement, setEditingMovement] = useState<any>(null);
    const [editQuantity, setEditQuantity] = useState("");
    const [editReferenceDoc, setEditReferenceDoc] = useState("");

    // Computed - Apply store, product and date filters
    const filteredMovements = movements.filter(m => {
        // Store filter - IMPORTANT: each store has its own movements
        if (selectedStore && m.storeId !== selectedStore.id) return false;

        // Product filter
        if (filterProduct !== "all" && m.productId !== filterProduct) return false;

        // Date range filter
        if (filterDateStart && m.dateMovement < filterDateStart) return false;
        if (filterDateEnd && m.dateMovement > filterDateEnd) return false;

        return true;
    });

    // Calculate STOCK INITIAL, ENTREE, SORTIE, RESTE for each movement
    // Formula: RESTE = STOCK INITIAL + ENTREE - SORTIE
    // First entry for a product becomes Stock Initial, subsequent entries become Entrée
    const movementsWithBalance = (() => {
        // Sort chronologically (oldest first) by date then by createdAt for stable ordering
        const sorted = [...filteredMovements].sort((a, b) => {
            const dateCompare = new Date(a.dateMovement).getTime() - new Date(b.dateMovement).getTime();
            if (dateCompare !== 0) return dateCompare;
            // If same date, sort by createdAt
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        // Track running balance per product and whether first entry was made
        const balanceByProduct: Record<string, number> = {};
        const hasInitialStock: Record<string, boolean> = {};

        return sorted.map(m => {
            const previousBalance = balanceByProduct[m.productId] || 0;
            const isEntry = m.movementType === 'ENTRY' || m.movementType === 'RETURN';
            const isFirstEntryForProduct = isEntry && !hasInitialStock[m.productId];

            let stockInitial: number;
            let entree: number;
            let sortie: number;

            if (isFirstEntryForProduct) {
                // First entry becomes Stock Initial (not Entrée)
                stockInitial = Number(m.quantity);
                entree = 0;
                sortie = 0;
                hasInitialStock[m.productId] = true;
            } else {
                // Subsequent movements
                stockInitial = previousBalance;
                entree = isEntry ? Number(m.quantity) : 0;
                sortie = !isEntry ? Number(m.quantity) : 0;
            }

            // RESTE = STOCK INITIAL + ENTREE - SORTIE
            const reste = stockInitial + entree - sortie;

            // Update balance for next iteration
            balanceByProduct[m.productId] = reste;

            return {
                ...m,
                stockInitial,
                entree,
                sortie,
                reste
            };
        }); // Keep chronological order: oldest at top, newest at bottom
    })();

    // Pagination computed values
    const totalPages = Math.ceil(movementsWithBalance.length / itemsPerPage);
    const paginatedMovements = movementsWithBalance.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset to page 1 when filters change
    const resetPagination = () => setCurrentPage(1);

    // Handlers
    const handleMovement = async (type: 'ENTRY' | 'EXIT') => {
        if (!selectedProduct || !quantity || Number(quantity) <= 0) {
            toast.error("Veuillez remplir correctement les champs");
            return;
        }

        await recordMovement({
            productId: selectedProduct,
            movementType: type,
            quantity: Number(quantity),
            referenceDoc: reference,
            dateMovement: dateMovement
        });

        setIsEntryOpen(false);
        setIsExitOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setSelectedProduct("");
        setQuantity("");
        setReference("");
        setDateMovement(format(new Date(), 'yyyy-MM-dd'));
    };

    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Fiche de Suivi');

        // Get unique product names from filtered movements
        const productNames = [...new Set(movementsWithBalance.map(m =>
            products.find(p => p.id === m.productId)?.name || 'Inconnu'
        ))].join(', ');

        // Leave 4 empty rows for title, table starts at row 5
        // Column A is empty (shift table to the right)

        // Add merged title in row 2 (spanning columns B to H)
        worksheet.mergeCells('B2:H2');
        const titleCell = worksheet.getCell('B2');
        titleCell.value = `Fiche de Suivi de ${productNames}`;
        titleCell.font = { bold: true, size: 16 };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Add date in row 3
        worksheet.mergeCells('B3:H3');
        const dateCell = worksheet.getCell('B3');
        dateCell.value = `Date: ${format(new Date(), 'dd/MM/yyyy')}`;
        dateCell.font = { italic: true, size: 11 };
        dateCell.alignment = { horizontal: 'center' };

        // Define headers starting at row 5, column B - NEW STRUCTURE
        const headers = ['Date', 'Produit', 'Stock Initial', 'Entrée', 'N° Fact/Nom', 'Sortie', 'Reste'];
        const headerRow = worksheet.getRow(5);
        headers.forEach((header, index) => {
            const cell = headerRow.getCell(index + 2); // Start at column B (index 2)
            cell.value = header;
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Use movementsWithBalance (already in chronological order: oldest first)
        const sortedForExport = movementsWithBalance;

        let rowIndex = 6; // Data starts at row 6
        sortedForExport.forEach(m => {
            const prodName = products.find(p => p.id === m.productId)?.name || 'Inconnu';
            const row = worksheet.getRow(rowIndex);

            const rowData = [
                format(new Date(m.dateMovement), 'dd/MM/yyyy'),
                prodName,
                m.stockInitial,
                m.entree > 0 ? m.entree : '',
                m.referenceDoc || '-',
                m.sortie > 0 ? m.sortie : '',
                m.reste
            ];

            rowData.forEach((value, index) => {
                const cell = row.getCell(index + 2); // Start at column B
                cell.value = value;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            rowIndex++;
        });

        // Set column widths (Column A is spacer, B-H are data columns)
        worksheet.getColumn(1).width = 3;  // Spacer column A
        worksheet.getColumn(2).width = 15; // Date
        worksheet.getColumn(3).width = 25; // Produit
        worksheet.getColumn(4).width = 15; // Stock Initial
        worksheet.getColumn(5).width = 12; // Entrée
        worksheet.getColumn(6).width = 20; // N° Fact/Nom
        worksheet.getColumn(7).width = 12; // Sortie
        worksheet.getColumn(8).width = 12; // Reste

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Fiche_Suivi_${selectedStore?.name}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
        toast.success("Fiche de suivi exportée !");
    };

    const handleInventoryAdjustment = async () => {
        if (!inventoryProductId || inventoryQuantity === "") {
            toast.error("Veuillez sélectionner un produit et entrer la quantité réelle");
            return;
        }

        const currentLevel = stockLevels.find(l => l.productId === inventoryProductId)?.currentQuantity || 0;
        const targetQuantity = Number(inventoryQuantity);
        const difference = targetQuantity - currentLevel;

        if (difference === 0) {
            toast.info("Le stock est déjà à ce niveau");
            setIsInventoryOpen(false);
            return;
        }

        // Create an adjustment movement
        const movementType = difference > 0 ? 'ENTRY' : 'EXIT';
        const adjustmentQuantity = Math.abs(difference);

        await recordMovement({
            productId: inventoryProductId,
            movementType: movementType,
            quantity: adjustmentQuantity,
            referenceDoc: `INVENTAIRE - Ajustement ${difference > 0 ? '+' : ''}${difference}`,
            dateMovement: format(new Date(), 'yyyy-MM-dd')
        });

        setIsInventoryOpen(false);
        setInventoryProductId("");
        setInventoryQuantity("");
        toast.success(`Stock ajusté de ${currentLevel} à ${targetQuantity}`);
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Gestion de Stock - {selectedStore?.name}</h1>
                        <p className="text-muted-foreground">Suivi des entrées et sorties, inventaire.</p>
                    </div>
                    <div className="flex gap-2">
                        <Dialog open={isEntryOpen} onOpenChange={setIsEntryOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-green-600 hover:bg-green-700">
                                    <ArrowDownLeft className="mr-2 h-4 w-4" /> Entrée / Réception
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Réception de Stock (Entrée)</DialogTitle>
                                </DialogHeader>
                                <MovementForm
                                    products={products}
                                    values={{ selectedProduct, quantity, reference, dateMovement }}
                                    setters={{ setSelectedProduct, setQuantity, setReference, setDateMovement }}
                                    onSubmit={() => handleMovement('ENTRY')}
                                    submitLabel="Enregistrer Entrée"
                                />
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isExitOpen} onOpenChange={setIsExitOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-orange-600 hover:bg-orange-700">
                                    <ArrowUpRight className="mr-2 h-4 w-4" /> Sortie / Vente
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Sortie de Stock (Vente)</DialogTitle>
                                </DialogHeader>
                                <MovementForm
                                    products={products}
                                    values={{ selectedProduct, quantity, reference, dateMovement }}
                                    setters={{ setSelectedProduct, setQuantity, setReference, setDateMovement }}
                                    onSubmit={() => handleMovement('EXIT')}
                                    submitLabel="Enregistrer Sortie"
                                />
                            </DialogContent>
                        </Dialog>

                        {/* Inventory Adjustment Dialog */}
                        <Dialog open={isInventoryOpen} onOpenChange={setIsInventoryOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                                    <ClipboardCheck className="mr-2 h-4 w-4" /> Inventaire
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Ajustement d'Inventaire</DialogTitle>
                                    <DialogDescription>
                                        Corrigez le niveau de stock après un inventaire physique.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Produit</Label>
                                        <Select value={inventoryProductId} onValueChange={(val) => {
                                            setInventoryProductId(val);
                                            const currentStock = stockLevels.find(l => l.productId === val)?.currentQuantity || 0;
                                            setInventoryQuantity(String(currentStock));
                                        }}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choisir un produit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name} (Stock actuel: {stockLevels.find(l => l.productId === p.id)?.currentQuantity || 0})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Quantité Réelle (après comptage)</Label>
                                        <Input
                                            type="number"
                                            value={inventoryQuantity}
                                            onChange={(e) => setInventoryQuantity(e.target.value)}
                                            min="0"
                                            placeholder="Quantité comptée physiquement"
                                        />
                                    </div>
                                    {inventoryProductId && (
                                        <div className="p-3 rounded-md bg-muted text-sm">
                                            <strong>Stock système:</strong> {stockLevels.find(l => l.productId === inventoryProductId)?.currentQuantity || 0}<br />
                                            <strong>Quantité réelle:</strong> {inventoryQuantity || '?'}<br />
                                            <strong>Différence:</strong> {inventoryQuantity !== ""
                                                ? Number(inventoryQuantity) - (stockLevels.find(l => l.productId === inventoryProductId)?.currentQuantity || 0)
                                                : '?'}
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsInventoryOpen(false)}>Annuler</Button>
                                    <Button onClick={handleInventoryAdjustment}>Appliquer Ajustement</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Fiche de Suivi (Historique)</h2>
                            <Button variant="outline" onClick={handleExportExcel}>
                                <Download className="mr-2 h-4 w-4" /> Excel
                            </Button>
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Produit</Label>
                                <Select value={filterProduct} onValueChange={setFilterProduct}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Tous les produits" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les produits</SelectItem>
                                        {Object.entries(
                                            [...products].sort((a, b) => a.name.localeCompare(b.name))
                                                .reduce((groups: Record<string, typeof products>, p) => {
                                                    const cat = p.unitLabel || 'Autre';
                                                    if (!groups[cat]) groups[cat] = [];
                                                    groups[cat].push(p);
                                                    return groups;
                                                }, {})
                                        ).sort(([a], [b]) => a.localeCompare(b)).map(([category, prods]) => (
                                            <SelectGroup key={category}>
                                                <SelectLabel className="text-xs font-semibold text-primary">{category}</SelectLabel>
                                                {prods.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Du</Label>
                                <Input
                                    type="date"
                                    className="w-[150px]"
                                    value={filterDateStart}
                                    onChange={(e) => setFilterDateStart(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Au</Label>
                                <Input
                                    type="date"
                                    className="w-[150px]"
                                    value={filterDateEnd}
                                    onChange={(e) => setFilterDateEnd(e.target.value)}
                                />
                            </div>

                            {(filterDateStart || filterDateEnd || filterProduct !== "all") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setFilterProduct("all");
                                        setFilterDateStart("");
                                        setFilterDateEnd("");
                                    }}
                                >
                                    Réinitialiser
                                </Button>
                            )}
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Produit</TableHead>
                                <TableHead className="text-right">Stock Initial</TableHead>
                                <TableHead className="text-right">Entrée</TableHead>
                                <TableHead>N° Fact/Nom</TableHead>
                                <TableHead className="text-right">Sortie</TableHead>
                                <TableHead className="text-right">Reste</TableHead>
                                <TableHead className="text-center w-[80px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedMovements.map((movement) => {
                                const prod = products.find(p => p.id === movement.productId);
                                return (
                                    <TableRow key={movement.id} className={paginatedMovements.indexOf(movement) % 2 === 0 ? 'bg-muted/30' : ''}>
                                        <TableCell>{format(new Date(movement.dateMovement), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell className="font-medium">{prod?.name}</TableCell>
                                        <TableCell className="text-right">
                                            {movement.stockInitial}
                                        </TableCell>
                                        <TableCell className="text-right text-green-600 font-medium">
                                            {movement.entree > 0 ? movement.entree : '-'}
                                        </TableCell>
                                        <TableCell>{movement.referenceDoc || '-'}</TableCell>
                                        <TableCell className="text-right text-orange-600 font-medium">
                                            {movement.sortie > 0 ? movement.sortie : '-'}
                                        </TableCell>
                                        <TableCell className={`text-right font-bold ${movement.reste < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {movement.reste}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600"
                                                    onClick={() => {
                                                        setEditingMovement(movement);
                                                        setEditQuantity(String(movement.entree > 0 ? movement.entree : movement.sortie));
                                                        setEditReferenceDoc(movement.referenceDoc || "");
                                                        setIsEditDialogOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => {
                                                        setMovementToDelete(movement.id);
                                                        setIsDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {paginatedMovements.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">Aucun mouvement enregistré.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {totalPages >= 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t gap-4">
                            <div className="flex items-center gap-4">
                                <div className="text-sm text-muted-foreground">
                                    Page {currentPage} sur {totalPages} ({movementsWithBalance.length} mouvements)
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Afficher</span>
                                    <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
                                        <SelectTrigger className="w-[75px] h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="25">25</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm text-muted-foreground">lignes</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Précédent
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Suivant
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center text-xl">Confirmation de suppression</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-base py-4">
                            Êtes-vous sûr de vouloir supprimer ce mouvement ? Cette action est irréversible et mettra à jour le stock.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex justify-center gap-4 sm:justify-center">
                        <AlertDialogCancel className="bg-red-500 text-white hover:bg-red-600 border-0">
                            NON
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-green-500 text-white hover:bg-green-600"
                            onClick={() => {
                                if (movementToDelete) {
                                    deleteMovement(movementToDelete);
                                    toast.success("Mouvement supprimé avec succès");
                                }
                                setMovementToDelete(null);
                            }}
                        >
                            OUI
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Movement Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Modifier le mouvement</DialogTitle>
                        <DialogDescription>
                            Modifiez les informations du mouvement
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Produit</Label>
                            <Input
                                value={products.find(p => p.id === editingMovement?.productId)?.name || ""}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Input
                                value={editingMovement?.movementType === 'ENTRY' || editingMovement?.movementType === 'RETURN' ? 'Entrée' : 'Sortie'}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Quantité</Label>
                            <Input
                                type="number"
                                value={editQuantity}
                                onChange={e => setEditQuantity(e.target.value)}
                                min="1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Référence (N° Facture / Nom)</Label>
                            <Input
                                value={editReferenceDoc}
                                onChange={e => setEditReferenceDoc(e.target.value)}
                                placeholder="Ex: FACT-001"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
                        <Button onClick={() => {
                            if (editingMovement && editQuantity) {
                                // For now, we'll delete and recreate the movement with new values
                                // This maintains stock integrity
                                const isEntry = editingMovement.movementType === 'ENTRY' || editingMovement.movementType === 'RETURN';
                                deleteMovement(editingMovement.id);
                                recordMovement({
                                    productId: editingMovement.productId,
                                    movementType: editingMovement.movementType,
                                    quantity: Number(editQuantity),
                                    referenceDoc: editReferenceDoc,
                                    dateMovement: editingMovement.dateMovement
                                });
                                toast.success("Mouvement modifié avec succès");
                                setIsEditDialogOpen(false);
                                setEditingMovement(null);
                            }
                        }}>Enregistrer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

// Subcomponent for reuse
function MovementForm({ products, values, setters, onSubmit, submitLabel }: any) {
    // Group products by category and sort alphabetically
    const groupedProducts = Object.entries(
        [...products].sort((a: any, b: any) => a.name.localeCompare(b.name))
            .reduce((groups: Record<string, any[]>, p: any) => {
                const cat = p.unitLabel || 'Autre';
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(p);
                return groups;
            }, {})
    ).sort(([a], [b]) => a.localeCompare(b));

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={values.dateMovement} onChange={(e: any) => setters.setDateMovement(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label>Produit</Label>
                <Select value={values.selectedProduct} onValueChange={setters.setSelectedProduct}>
                    <SelectTrigger>
                        <SelectValue placeholder="Choisir un produit" />
                    </SelectTrigger>
                    <SelectContent>
                        {groupedProducts.map(([category, prods]: [string, any[]]) => (
                            <SelectGroup key={category}>
                                <SelectLabel className="text-xs font-semibold text-primary">{category}</SelectLabel>
                                {prods.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectGroup>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Quantité</Label>
                <Input type="number" value={values.quantity} onChange={(e: any) => setters.setQuantity(e.target.value)} min="1" />
            </div>
            <div className="space-y-2">
                <Label>Référence (N° Facture / Nom)</Label>
                <Input value={values.reference} onChange={(e: any) => setters.setReference(e.target.value)} placeholder="Ex: FACT-001" />
            </div>
            <Button className="w-full mt-4" onClick={onSubmit}>{submitLabel}</Button>
        </div>
    );
}

function PackageIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22v-9" />
        </svg>
    )
}

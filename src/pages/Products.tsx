
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAppStore } from "@/context/AppContext";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Plus, Search, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Products = () => {
    const { products, addProduct, updateProduct, deleteProduct } = useAppStore();
    const { selectedAgency } = useAuth();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        unitLabel: ""
    });

    const resetForm = () => {
        setFormData({ name: "", unitLabel: "" });
        setEditingProduct(null);
    };

    const handleOpenDialog = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                unitLabel: product.unitLabel
            });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.unitLabel) {
            return;
        }

        // Check for duplicate product name
        const isDuplicate = products.some(
            p => p.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
                && (!editingProduct || p.id !== editingProduct.id)
        );
        if (isDuplicate) {
            toast.error("Un produit avec ce nom existe déjà");
            return;
        }

        if (editingProduct) {
            await updateProduct(editingProduct.id, {
                name: formData.name.trim(),
                unitLabel: formData.unitLabel.trim()
            });
        } else {
            await addProduct({
                name: formData.name.trim(),
                unitLabel: formData.unitLabel.trim()
            });
        }
        setIsDialogOpen(false);
        resetForm();
    };

    // Filter and sort products alphabetically
    const filteredProducts = products
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.unitLabel.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Produits - {selectedAgency?.name}</h1>
                        <p className="text-muted-foreground">Catalogue des produits de l'agence.</p>
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" /> Nouveau Produit
                    </Button>
                </div>

                {/* Search Bar + Counter */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100">
                        <Package className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-700">{products.length} Produits</span>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher un produit..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="rounded-xl border bg-card shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Nom du produit</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.map((product, index) => (
                                <TableRow key={product.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                                    <TableCell className="text-muted-foreground font-mono text-sm">{index + 1}</TableCell>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell>{product.unitLabel}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => setDeleteProductId(product.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredProducts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        {searchQuery ? "Aucun produit trouvé." : "Aucun produit. Ajoutez-en un pour commencer."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingProduct ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nom</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Riz Sana 25kg"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unit">Catégorie</Label>
                                <Input
                                    id="unit"
                                    value={formData.unitLabel}
                                    onChange={(e) => setFormData({ ...formData, unitLabel: e.target.value })}
                                    placeholder="Ex: Sac 25kg"
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                                <Button type="submit">Enregistrer</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!deleteProductId} onOpenChange={(open) => !open && setDeleteProductId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-center text-lg">Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription className="text-center">
                                Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex justify-center gap-4 sm:justify-center">
                            <AlertDialogCancel className="bg-red-600 text-white hover:bg-red-700 hover:text-white">
                                ANNULER
                            </AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-green-600 text-white hover:bg-green-700"
                                onClick={() => {
                                    if (deleteProductId) {
                                        deleteProduct(deleteProductId);
                                        setDeleteProductId(null);
                                    }
                                }}
                            >
                                OUI
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
};

export default Products;

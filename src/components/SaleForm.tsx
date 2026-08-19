import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Employee = {
  id: string;
  name: string;
  role: string;
};

export type Product = {
  id: string;
  name: string;
  unitLabel: string;
};

export type SaleLine = {
  id: string;
  employeeId: string;
  productId: string;
  quantity: number;
  createdAt: string;
};

const EMPLOYEES: Employee[] = [
  { id: "souaibou-amadou", name: "Souaibou Amadou", role: "CA" },
  { id: "abdouraman-nassourou", name: "Abdouraman Nassourou", role: "Comptable" },
  { id: "hamidou-bouba", name: "Hamidou Bouba", role: "Commercial" },
  { id: "alioum-hamadou", name: "Alioum Hamadou", role: "Facturier" },
  { id: "hamadou-adama", name: "Hamadou Adama", role: "Magasinier P" },
  { id: "abdouraman-umar", name: "Abdouraman Umar", role: "Magasinier A" },
  { id: "adamou-mamoudou", name: "Adamou Mamoudou", role: "Vendeur 1" },
  { id: "haman-sali", name: "Haman Sali", role: "Vendeur 2" },
  { id: "aboubakar-siddik", name: "Aboubakar Siddik", role: "Caissier" },
  { id: "boubakary-njidda", name: "Boubakary Njidda", role: "Chauffeur" },
  { id: "kamaldine-oumarou", name: "Kamaldine Oumarou", role: "Vendeur 3" },
  { id: "asmaou", name: "Asmaou", role: "Informaticienne" },
];

const PRODUCTS: Product[] = [
  { id: "sana-25-25", name: "Riz Sana Indien 25kg", unitLabel: "Sac 25kg" },
  { id: "sana-25-50", name: "Riz Sana Indien 50kg", unitLabel: "Sac 50kg" },
];

type SaleFormProps = {
  onAddSale: (sale: SaleLine) => void;
  products?: Product[];
  employees?: Employee[];
  onAddEmployee?: (employee: Employee) => void;
};

export const SaleForm: React.FC<SaleFormProps> = ({ onAddSale, products: productsProp, employees: employeesProp, onAddEmployee }) => {
  const [employeeId, setEmployeeId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [error, setError] = useState<string | null>(null);

  const effectiveProducts = productsProp ?? PRODUCTS;
  const effectiveEmployees = employeesProp ?? EMPLOYEES;
  const selectedProduct = effectiveProducts.find((p) => p.id === productId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId) {
      setError("Veuillez sélectionner un membre du personnel.");
      return;
    }

    if (!productId) {
      setError("Veuillez sélectionner un produit.");
      return;
    }

    const parsedQty = Number(quantity);
    if (!parsedQty || parsedQty <= 0) {
      setError("La quantité doit être un nombre positif.");
      return;
    }

    if (!selectedProduct) return;

    const sale: SaleLine = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      employeeId,
      productId,
      quantity: parsedQty,
      createdAt: new Date().toISOString(),
    };

    onAddSale(sale);
    setQuantity("1");
    setProductId("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-card/60 p-6 shadow-sm backdrop-blur">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="employee">Personnel</Label>
          <Select
            value={employeeId}
            onValueChange={(value) => {
              if (value === "__add_employee__") {
                const name = window.prompt("Nom et prénom du nouveau personnel :")?.trim();
                if (!name) return;
                const role = window.prompt("Fonction du nouveau personnel :")?.trim();
                if (!role) return;

                const id = name
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[^a-z0-9\s-]/g, "")
                  .trim()
                  .replace(/\s+/g, "-");

                const newEmployee: Employee = { id: id || `${Date.now()}`, name, role };
                onAddEmployee?.(newEmployee);
                setEmployeeId(newEmployee.id);
                return;
              }

              setEmployeeId(value);
            }}
          >
            <SelectTrigger id="employee">
              <SelectValue placeholder="Sélectionner un membre du personnel" />
            </SelectTrigger>
            <SelectContent>
              {effectiveEmployees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{`${emp.name} — ${emp.role}`}</SelectItem>
              ))}
              <SelectItem value="__add_employee__">AJOUT PERSONELS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product">Produit</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger id="product">
              <SelectValue placeholder="Choisir un produit" />
            </SelectTrigger>
            <SelectContent>
              {effectiveProducts.map((product) => (
                <SelectItem key={product.id} value={product.id}>{`${product.name}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantité</Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>


      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end">
        <Button type="submit" size="lg" className="w-full md:w-auto">
          <span className="mr-2">+</span> Ajouter la vente
        </Button>
      </div>
    </form>
  );
};

export const employees = EMPLOYEES;
export const products = PRODUCTS;


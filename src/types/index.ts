export interface Agency {
    id: string;
    name: string;
    location: string;
}

export interface Store {
    id: string;
    agencyId: string;
    name: string;
    createdAt?: string;
}

export interface AppUser {
    id: string;
    username: string;
    fullName: string;
    role: 'admin' | 'manager' | 'magasinier' | 'vendeur';
    defaultAgencyId?: string;
    defaultStoreId?: string;
}

export interface Product {
    id: string;
    agencyId: string;
    name: string;
    unitLabel: string;
}

export interface StockMovement {
    id: string;
    storeId: string;
    productId: string;
    userId: string;
    movementType: 'ENTRY' | 'EXIT' | 'RETURN' | 'ADJUSTMENT';
    quantity: number;
    referenceDoc?: string;
    dateMovement: string;
    createdAt: string;
}

export interface StockLevel {
    storeId: string;
    productId: string;
    currentQuantity: number;
}

export interface Employee {
    id: string;
    name: string;
    role: string;
    agency_id?: string;
}

export interface SaleLine {
    id: string;
    employeeId: string;
    productId: string;
    quantity: number;
    createdAt: string;
}

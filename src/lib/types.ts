export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    purchase_price?: number;
    created_at?: string;
}

export interface Branch {
    id: string;
    name: string;
    location: string;
    encargado?: string;
    created_at?: string;
}

export interface Provider {
    id: string;
    name: string;
    contact_person?: string;
    contact_number?: string;
    created_at?: string;
}

export interface StockMovement {
    id: string;
    product_id: string;
    product_name: string;
    branch_id: string;
    branch_name: string;
    type: 'inflow' | 'outflow' | 'transfer' | 'conversion';
    quantity: number;
    date: string;
    price_at_transaction?: number;
    remission_number: string;
    provider_id?: string;
    provider_name?: string;
    comment?: string;
    created_at?: string;
    index_in_transaction?: number;
}

export interface PayableInvoice {
    id: string;
    remission_number: string;
    date: string;
    provider_id?: string;
    provider_name?: string;
    total_amount: number;
    payment_status: 'Pendiente' | 'Pagado Parcialmente' | 'Pagado';
    due_date?: string;
    iva?: number;
    retefuente?: number;
    created_at?: string;
    updated_at?: string;
}

export interface InvoicePayment {
    id: string;
    invoice_id: string;
    amount: number;
    date: string;
    created_at?: string;
}

export interface InventoryCount {
    id: string;
    date: string;
    branch_id: string;
    branch_name: string;
    responsible?: string;
    status: 'en progreso' | 'completado';
    notes?: string;
    adjustments_applied?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface InventoryCountItem {
    id: string;
    count_id: string;
    product_id: string;
    product_name: string;
    theoretical_quantity: number;
    physical_quantity: number;
    difference: number;
}

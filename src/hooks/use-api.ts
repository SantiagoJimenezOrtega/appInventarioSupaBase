import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, Branch, Provider, StockMovement } from '@/lib/types';

// Generic fetcher
async function fetcher<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
}

// --- PRODUCTS ---
export function useProducts() {
    return useQuery({
        queryKey: ['products'],
        queryFn: () => fetcher<Product[]>('/api/products'),
    });
}

export function useCreateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<Product>) => {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create product');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

export function useUpdateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
            const res = await fetch(`/api/products/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update product');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/products/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete product');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

// --- BRANCHES ---
export function useBranches() {
    return useQuery({
        queryKey: ['branches'],
        queryFn: () => fetcher<Branch[]>('/api/branches'),
    });
}

export function useCreateBranch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<Branch>) => {
            const res = await fetch('/api/branches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create branch');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        },
    });
}

export function useUpdateBranch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Branch> }) => {
            const res = await fetch(`/api/branches/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update branch');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        },
    });
}

export function useDeleteBranch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/branches/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete branch');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        },
    });
}

// --- PROVIDERS ---
export function useProviders() {
    return useQuery({
        queryKey: ['providers'],
        queryFn: () => fetcher<Provider[]>('/api/providers'),
    });
}

export function useCreateProvider() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<Provider>) => {
            const res = await fetch('/api/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create provider');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['providers'] });
        },
    });
}

export function useUpdateProvider() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Provider> }) => {
            const res = await fetch(`/api/providers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update provider');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['providers'] });
        },
    });
}

export function useDeleteProvider() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/providers/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete provider');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['providers'] });
        },
    });
}

// --- STOCK MOVEMENTS ---
export function useStockMovements(options: Record<string, string> = {}) {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([k, v]) => v && params.append(k, v));

    return useQuery({
        queryKey: ['stock-movements', options],
        queryFn: () => fetcher<StockMovement[]>(`/api/stock-movements?${params}`),
    });
}

export function useCreateStockMovement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/stock-movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
        },
    });
}

export function useUpdateStockMovement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetch(`/api/stock-movements/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update stock movement');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
        },
    });
}

export function useDeleteStockMovement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/stock-movements/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete stock movement');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
        },
    });
}

export function useUpdateRemission() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ remissionNumber, data }: { remissionNumber: string; data: any }) => {
            const res = await fetch(`/api/stock-movements?remissionNumber=${remissionNumber}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update remission');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
        },
    });
}

export function useDeleteRemission() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (remissionNumber: string) => {
            const res = await fetch(`/api/stock-movements?remissionNumber=${remissionNumber}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete remission');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
        },
    });
}

// --- INVENTORY COUNTS ---
export function useInventoryCounts() {
    return useQuery({
        queryKey: ['inventory-counts'],
        queryFn: () => fetcher<any[]>('/api/inventory-counts'),
    });
}

export function useInventoryCount(id: string) {
    return useQuery({
        queryKey: ['inventory-counts', id],
        queryFn: () => fetcher<any>(`/api/inventory-counts/${id}`),
        enabled: !!id,
    });
}

export function useCreateInventoryCount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/inventory-counts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create inventory count');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
        },
    });
}

export function useUpdateInventoryCount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetch(`/api/inventory-counts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update inventory count');
            return res.json();
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-counts', id] });
        },
    });
}

export function useApplyInventoryCount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/inventory-counts/${id}/apply`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-counts', id] });
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
        },
    });
}

export function useDeleteInventoryCount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/inventory-counts/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete inventory count');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
        },
    });
}

// --- INVOICES & PAYMENTS ---
export function useInvoices() {
    return useQuery({
        queryKey: ['invoices'],
        queryFn: () => fetcher<any[]>('/api/invoices'),
    });
}

export function useRegisterPayment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { invoice_id: string; amount: number; date: string }) => {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
    });
}

export function useDeleteInvoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/invoices/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete invoice');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
    });
}

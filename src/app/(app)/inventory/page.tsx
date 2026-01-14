"use client";

import React, { useState, useMemo } from "react";
import { useStockMovements, useProducts, useBranches, useUpdateProduct } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, ChevronLeft, ChevronRight, Package, TrendingUp, DollarSign, ChevronDown, ChevronRight as ChevronRightIcon, Store } from "lucide-react";
import { ExcelExportButton } from "@/components/excel-export-button";
import { InventoryImportDialog } from "@/components/inventory-import-dialog";
import { toast } from "sonner";

interface FIFOLayer {
    quantity: number;
    cost: number;
    date: string;
}

interface InventoryItem {
    productId: string;
    productName: string;
    branchId: string;
    branchName: string;
    quantity: number;
    averageCost: number;
    totalValue: number;
    layers: FIFOLayer[];
}

interface GroupedInventory {
    productId: string;
    productName: string;
    totalQuantity: number;
    totalValue: number;
    averageCost: number;
    branches: InventoryItem[];
}

export default function InventoryPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [branchFilter, setBranchFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const { data: movements, isLoading: movementsLoading } = useStockMovements();
    const { data: products } = useProducts();
    const { data: branches } = useBranches();
    const updateProduct = useUpdateProduct();

    const handleProductUpdate = async (productId: string, field: 'price' | 'purchase_price', value: string) => {
        try {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue < 0) {
                toast.error("Valor inválido");
                return;
            }

            await updateProduct.mutateAsync({
                id: productId,
                data: { [field]: numValue }
            });

            toast.success("Producto actualizado correctamente");
        } catch (error) {
            toast.error("Error al actualizar el producto");
        }
    };

    // Calculate FIFO inventory with layers
    const inventory = useMemo(() => {
        if (!movements || !products || !branches) return [];

        const inventoryMap = new Map<string, InventoryItem>();

        const sortedMovements = [...movements].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return a.type === 'inflow' ? -1 : 1;
        });

        // Initialize Map with ALL products for ALL branches
        products.forEach(p => {
            branches.forEach(b => {
                const key = `${String(p.id).trim()}-${String(b.id).trim()}`;
                inventoryMap.set(key, {
                    productId: p.id,
                    productName: p.name,
                    branchId: b.id,
                    branchName: b.name,
                    quantity: 0,
                    averageCost: 0,
                    totalValue: 0,
                    layers: []
                });
            });
        });

        const skippedMovements: Record<string, number> = {};
        let totalSkipped = 0;

        sortedMovements.forEach(movement => {
            const pId = String(movement.product_id).trim();
            const bId = String(movement.branch_id).trim();
            const key = `${pId}-${bId}`;
            const item = inventoryMap.get(key);

            if (!item) {
                totalSkipped += Number(movement.quantity) || 0;
                skippedMovements[pId] = (skippedMovements[pId] || 0) + (Number(movement.quantity) || 0);
                return;
            }

            const qty = Number(movement.quantity) || 0;
            const price = Number(movement.price_at_transaction || 0);

            const isAddition = movement.type === 'inflow' || ((movement.type === 'transfer' || movement.type === 'conversion' || movement.type === 'adjustment') && qty > 0);
            const isSubtraction = movement.type === 'outflow' || ((movement.type === 'transfer' || movement.type === 'conversion' || movement.type === 'adjustment') && qty < 0);

            if (isAddition) {
                const realQty = qty; // No usamos abs() para permitir negativos si el usuario los registra así
                item.layers.push({
                    quantity: realQty,
                    cost: price,
                    date: movement.date
                });

                item.quantity += realQty;
                item.totalValue += realQty * price;
            } else if (isSubtraction) {
                let remainingToRemove = Math.abs(qty);

                while (remainingToRemove > 0 && item.layers.length > 0) {
                    const oldestLayer = item.layers[0];

                    if (oldestLayer.quantity <= remainingToRemove) {
                        remainingToRemove -= oldestLayer.quantity;
                        item.quantity -= oldestLayer.quantity;
                        item.totalValue -= oldestLayer.quantity * oldestLayer.cost;
                        item.layers.shift();
                    } else {
                        oldestLayer.quantity -= remainingToRemove;
                        item.quantity -= remainingToRemove;
                        item.totalValue -= remainingToRemove * oldestLayer.cost;
                        remainingToRemove = 0;
                    }
                }

                // If there's still quantity to remove but no layers left, allow negative quantity
                if (remainingToRemove > 0) {
                    item.quantity -= remainingToRemove;
                    // For value, if it goes negative, we use the transaction price to keep track of the deficit value
                    item.totalValue -= remainingToRemove * price;
                }
            }

            item.averageCost = item.quantity > 0 ? item.totalValue / item.quantity : 0;
        });

        return Array.from(inventoryMap.values());
    }, [movements, products, branches]);

    // Group by product
    const groupedInventory = useMemo(() => {
        const groups = new Map<string, GroupedInventory>();

        // Ensure ALL products exist in the grouped view
        if (products) {
            products.forEach(p => {
                groups.set(String(p.id).trim(), {
                    productId: p.id,
                    productName: p.name,
                    totalQuantity: 0,
                    totalValue: 0,
                    averageCost: 0,
                    branches: []
                });
            });
        }

        inventory.forEach(item => {
            const group = groups.get(String(item.productId).trim());
            if (!group) return;

            group.branches.push(item);
            group.totalQuantity += item.quantity;
            group.totalValue += item.totalValue;
            group.averageCost = group.totalQuantity > 0 ? group.totalValue / group.totalQuantity : 0;
        });

        // Convert to array and sort alphabetically by product name
        return Array.from(groups.values()).sort((a, b) =>
            a.productName.localeCompare(b.productName)
        );
    }, [inventory, products]);

    // Filter inventory
    const filteredInventory = groupedInventory.filter(item => {
        const matchesSearch =
            item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.branches.some(b => b.branchName?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesBranch = branchFilter === "all" ||
            item.branches.some(b => b.branchId === branchFilter);

        return matchesSearch && matchesBranch;
    });

    // Pagination
    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

    // Calculate totals based on filtered branches
    const totalQuantity = filteredInventory.reduce((sum, item) => {
        if (branchFilter === "all") return sum + item.totalQuantity;
        const branchData = item.branches.find(b => b.branchId === branchFilter);
        return sum + (branchData?.quantity || 0);
    }, 0);

    const totalValue = filteredInventory.reduce((sum, item) => {
        const product = products?.find(p => p.id === item.productId);
        const price = product?.purchase_price || 0;

        if (branchFilter === "all") return sum + (item.totalQuantity * price);
        const branchData = item.branches.find(b => b.branchId === branchFilter);
        return sum + ((branchData?.quantity || 0) * price);
    }, 0);

    const toggleRow = (productId: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(productId)) {
            newExpanded.delete(productId);
        } else {
            newExpanded.add(productId);
        }
        setExpandedRows(newExpanded);
    };

    // Format for export
    const exportData = inventory.map(item => {
        const product = products?.find(p => p.id === item.productId);
        const salePrice = product?.price || 0;
        return {
            Producto: item.productName,
            Sucursal: item.branchName,
            Cantidad: item.quantity,
            'Costo Promedio (FIFO)': item.averageCost,
            'Precio Venta Unit.': salePrice,
            'Valor Total (Venta)': item.quantity * salePrice
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventario FIFO</h1>
                    <p className="text-muted-foreground">Valorización y existencias actuales.</p>
                </div>
                <div className="flex gap-2">
                    <ExcelExportButton
                        type="products"
                        data={exportData}
                        fileName={`inventario_${new Date().toISOString().split('T')[0]}.xlsx`}
                    />
                    <InventoryImportDialog />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Package className="w-4 h-4" />
                        <span>Total Items</span>
                    </div>
                    <div className="text-2xl font-bold">{filteredInventory.length}</div>
                    <p className="text-xs text-gray-500 mt-1">Productos diferentes</p>
                </div>
                <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>Cantidad Total</span>
                    </div>
                    <div className="text-2xl font-bold">{totalQuantity.toFixed(2)}</div>
                    <p className="text-xs text-gray-500 mt-1">Unidades en stock</p>
                </div>
                <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span>Valor Total</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                        ${totalValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Inversión (Precio de Compra)</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2 flex-1">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Buscar por producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select value={branchFilter} onValueChange={setBranchFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Sucursal" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las sucursales</SelectItem>
                            {branches?.map(branch => (
                                <SelectItem key={branch.id} value={branch.id}>
                                    {branch.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-right">Cant. Total General</TableHead>
                            <TableHead className="text-right">Precio Unit. Compra</TableHead>
                            <TableHead className="text-right">Precio Unit. Venta</TableHead>
                            <TableHead className="text-right">Valor Inversión</TableHead>
                            <TableHead className="text-center">Sucursales</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {movementsLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : filteredInventory?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No hay inventario disponible.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedInventory?.map((group) => {
                                const isExpanded = expandedRows.has(group.productId);
                                const product = products?.find(p => String(p.id).trim() === String(group.productId).trim());

                                // Filter visible branches and calculate dynamic total for display
                                const visibleBranches = branchFilter === "all"
                                    ? group.branches
                                    : group.branches.filter(b => b.branchId === branchFilter);

                                const displayQuantity = branchFilter === "all"
                                    ? group.totalQuantity
                                    : visibleBranches.reduce((sum, b) => sum + b.quantity, 0);

                                return (
                                    <React.Fragment key={group.productId}>
                                        <TableRow
                                            className="hover:bg-gray-50"
                                        >
                                            <TableCell
                                                className="cursor-pointer"
                                                onClick={() => toggleRow(group.productId)}
                                            >
                                                {visibleBranches.length > 0 ? (
                                                    isExpanded ?
                                                        <ChevronDown className="w-4 h-4 text-gray-500" /> :
                                                        <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="font-medium">{group.productName}</TableCell>
                                            <TableCell className={`text-right font-bold ${displayQuantity < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                                {displayQuantity.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={product?.purchase_price || 0}
                                                    className="h-8 w-28 text-right bg-blue-50/30 border-blue-100 focus:border-blue-300"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onBlur={(e) => handleProductUpdate(group.productId, 'purchase_price', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={product?.price || 0}
                                                    className="h-8 w-28 text-right bg-green-50/30 border-green-100 focus:border-green-300"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onBlur={(e) => handleProductUpdate(group.productId, 'price', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-600">
                                                ${(displayQuantity * (product?.purchase_price || 0)).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Store className="w-3 h-3 text-gray-400" />
                                                    <span className="text-sm font-medium">
                                                        {branchFilter === "all" ? group.branches.length : visibleBranches.length}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        {/* Expanded rows showing branches */}
                                        {isExpanded && visibleBranches.map((branch, idx) => (
                                            <TableRow key={`${group.productId}-${branch.branchId}-${idx}`} className="bg-gray-50">
                                                <TableCell></TableCell>
                                                <TableCell className="pl-8">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Store className="w-3 h-3 text-gray-400" />
                                                        <span className="text-gray-600">{branch.branchName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className={`text-right font-bold ${branch.quantity < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                                    {branch.quantity.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            defaultValue={product?.purchase_price || 0}
                                                            className="h-7 w-24 text-right bg-blue-50/20 border-blue-100"
                                                            onBlur={(e) => handleProductUpdate(group.productId, 'purchase_price', e.target.value)}
                                                        />
                                                        <span className="text-[10px] text-gray-400 mt-1">
                                                            FIFO: ${branch.averageCost.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        defaultValue={product?.price || 0}
                                                        className="h-7 w-24 text-right bg-green-50/20 border-green-100"
                                                        onBlur={(e) => handleProductUpdate(group.productId, 'price', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right text-green-600 text-sm font-medium">
                                                    ${(branch.quantity * (product?.purchase_price || 0)).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </TableCell>
                                                <TableCell className="text-center text-xs text-gray-500">
                                                    {branch.layers.length} capas
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {filteredInventory && filteredInventory.length > 0 && (
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Mostrar</span>
                        <Select
                            value={String(itemsPerPage)}
                            onValueChange={(value) => {
                                setItemsPerPage(Number(value));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={itemsPerPage} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[25, 50, 100].map((pageSize) => (
                                    <SelectItem key={pageSize} value={String(pageSize)}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span>registros por página</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">
                            Página {currentPage} de {totalPages}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

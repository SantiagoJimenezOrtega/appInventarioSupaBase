"use client";

import React, { useState, useMemo } from "react";
import { useStockMovements, useDeleteStockMovement, useUpdateStockMovement, useDeleteRemission, useUpdateRemission, useBranches } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, RefreshCw, ChevronLeft, ChevronRight, Filter, ChevronDown, ChevronRight as ChevronRightIcon, Package, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MovementForm } from "@/components/movement-form";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { AddItemDialog } from "@/components/stock/add-item-dialog";

interface GroupedMovement {
    id: string;
    remissionNumber: string;
    type: string;
    date: string;
    branchName: string;
    providerName?: string;
    comment?: string;
    totalProducts: number;
    totalQuantity: number;
    items: any[];
}

export default function StockLogPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilters, setTypeFilters] = useState<string[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Edit/Delete state
    const [editingMovement, setEditingMovement] = useState<any>(null);
    const [editData, setEditData] = useState({ quantity: "0", priceAtTransaction: "0" });
    const [isSaving, setIsSaving] = useState(false);

    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [branchFilter, setBranchFilter] = useState("all");
    const [clientFilter, setClientFilter] = useState("");
    const [isFormDirty, setIsFormDirty] = useState(false);

    const [addingItemTo, setAddingItemTo] = useState<any>(null);
    const [itemToAddAround, setItemToAddAround] = useState<{ targetItem: any, group: GroupedMovement } | null>(null);

    const { data: movements, isLoading } = useStockMovements();
    const { data: branches } = useBranches();
    const deleteMovement = useDeleteStockMovement();
    const updateMovement = useUpdateStockMovement();
    const deleteRemission = useDeleteRemission();
    const updateRemission = useUpdateRemission();

    const handleDeleteRemission = async (group: GroupedMovement) => {
        const isSingle = group.totalProducts === 1 && group.remissionNumber === '-';
        const msg = isSingle
            ? "¿Estás seguro de eliminar este movimiento?"
            : `¿Estás seguro de eliminar todo el grupo de movimientos de la remisión ${group.remissionNumber}? Esta acción no se puede deshacer.`;

        if (!confirm(msg)) return;

        try {
            if (isSingle) {
                await deleteMovement.mutateAsync(group.items[0].id);
            } else {
                await deleteRemission.mutateAsync(group.remissionNumber);
            }
            toast.success("Eliminado correctamente");
        } catch (error: any) {
            toast.error("Error al eliminar: " + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este movimiento? Esta acción no se puede deshacer y afectará el inventario teórico.")) return;

        try {
            await deleteMovement.mutateAsync(id);
            toast.success("Movimiento eliminado correctamente");
        } catch (error: any) {
            toast.error("Error al eliminar: " + error.message);
        }
    };

    const handleEditClick = (item: any) => {
        setEditingMovement(item);
        setEditData({
            quantity: String(Math.abs(item.quantity)),
            priceAtTransaction: String(item.price_at_transaction || 0)
        });
    };

    const handleUpdate = async () => {
        if (!editingMovement) return;
        setIsSaving(true);
        try {
            const originalSign = editingMovement.quantity < 0 ? -1 : 1;
            await updateMovement.mutateAsync({
                id: editingMovement.id,
                data: {
                    quantity: parseFloat(editData.quantity) * originalSign,
                    price_at_transaction: parseFloat(editData.priceAtTransaction)
                }
            });
            toast.success("Movimiento actualizado");
            setEditingMovement(null);
        } catch (error: any) {
            toast.error("Error al actualizar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Group movements by remission number
    const groupedMovements = useMemo(() => {
        if (!movements) return [];

        const groups = new Map<string, GroupedMovement>();

        movements.forEach(movement => {
            const key = movement.remission_number || `single-${movement.id}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    id: key,
                    remissionNumber: movement.remission_number || '-',
                    type: movement.type,
                    date: movement.date,
                    branchName: movement.branch_name || '-',
                    providerName: movement.provider_name,
                    comment: movement.comment,
                    totalProducts: 0,
                    totalQuantity: 0,
                    items: []
                });
            }

            const group = groups.get(key)!;
            group.items.push(movement);

            // If any item is a transfer/conversion, the group is a transfer/conversion
            if (movement.type === 'transfer' || movement.type === 'conversion') {
                group.type = movement.type;
            }

            // AUTO-DETECT ADJUSTMENT: If remission starts with AJUSTE-CORTE
            if (movement.remission_number?.startsWith('AJUSTE-CORTE')) {
                group.type = 'adjustment';
            }

            group.totalProducts = group.items.length;
            group.totalQuantity += movement.quantity || 0;
        });

        // Sort items within each group and then update totalProducts and totalQuantity
        const sortedGroups = Array.from(groups.values()).map(group => {
            group.items.sort((a: any, b: any) => {
                if (a.index_in_transaction !== b.index_in_transaction) {
                    return (a.index_in_transaction || 0) - (b.index_in_transaction || 0);
                }
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });
            group.totalProducts = group.items.length;
            group.totalQuantity = group.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            return group;
        });

        return sortedGroups.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [movements]);

    // Filter movements
    const filteredMovements = groupedMovements.filter(m => {
        const matchesSearch =
            m.items.some(item =>
                item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.branch_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.remission_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.provider_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.comment?.toLowerCase().includes(searchTerm.toLowerCase())
            );

        const matchesType = typeFilters.length === 0 || typeFilters.includes(m.type);

        const movementDate = new Date(m.date);
        const matchesFrom = !dateFrom || movementDate >= new Date(dateFrom);
        const matchesTo = !dateTo || movementDate <= new Date(dateTo);

        const matchesBranch = branchFilter === "all" || m.branchName === branches?.find((b: any) => b.id === branchFilter)?.name;

        const matchesClient = !clientFilter ||
            m.providerName?.toLowerCase().includes(clientFilter.toLowerCase()) ||
            m.comment?.toLowerCase().includes(clientFilter.toLowerCase()) ||
            m.items.some(item =>
                item.comment?.toLowerCase().includes(clientFilter.toLowerCase())
            );

        return matchesSearch && matchesType && matchesFrom && matchesTo && matchesBranch && matchesClient;
    });

    // Pagination
    const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedMovements = filteredMovements.slice(startIndex, endIndex);

    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const getMovementIcon = (type: string) => {
        switch (type) {
            case "inflow": return <ArrowDownCircle className="w-4 h-4 text-green-600" />;
            case "outflow": return <ArrowUpCircle className="w-4 h-4 text-red-600" />;
            case "transfer": return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
            case "conversion": return <RefreshCw className="w-4 h-4 text-purple-600" />;
            case "adjustment": return <Filter className="w-4 h-4 text-amber-600" />;
            default: return null;
        }
    };

    const getMovementLabel = (type: string) => {
        switch (type) {
            case "inflow": return "Entrada";
            case "outflow": return "Salida";
            case "transfer": return "Traslado";
            case "conversion": return "Conversión";
            case "adjustment": return "Ajuste";
            default: return type;
        }
    };

    const getMovementColor = (type: string) => {
        switch (type) {
            case "inflow": return "bg-green-100 text-green-800";
            case "outflow": return "bg-red-100 text-red-800";
            case "transfer": return "bg-blue-100 text-blue-800";
            case "conversion": return "bg-purple-100 text-purple-800";
            case "adjustment": return "bg-amber-100 text-amber-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Movimientos de Inventario</h1>
                    <p className="text-muted-foreground">Historial de entradas, salidas y traslados.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="font-bold">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Movimiento
                        </Button>
                    </DialogTrigger>
                    <DialogContent
                        className="!w-[75vw] !max-w-none max-h-[90vh] overflow-y-auto"
                        showCloseButton={false}
                        onPointerDownOutside={(e) => {
                            if (isFormDirty) {
                                e.preventDefault();
                                toast.warning("Tienes cambios sin guardar. Usa el botón 'Cancelar / Salir' del formulario.");
                            }
                        }}
                        onEscapeKeyDown={(e) => {
                            if (isFormDirty) {
                                e.preventDefault();
                                toast.warning("Tienes cambios sin guardar. Usa el botón 'Cancelar / Salir' del formulario.");
                            }
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>{addingItemTo ? `Añadir item a remisión: ${addingItemTo.remissionNumber}` : 'Registrar Movimiento'}</DialogTitle>
                        </DialogHeader>
                        <MovementForm
                            onSuccess={() => {
                                setIsDialogOpen(false);
                                setAddingItemTo(null);
                                setIsFormDirty(false);
                            }}
                            onCancel={() => {
                                setIsDialogOpen(false);
                                setAddingItemTo(null);
                                setIsFormDirty(false);
                            }}
                            onDirtyChange={setIsFormDirty}
                            initialData={addingItemTo ? {
                                type: addingItemTo.type,
                                remissionNumber: addingItemTo.remissionNumber,
                                branchId: branches?.find((b: any) => b.name === addingItemTo.branchName)?.id,
                                providerId: addingItemTo.items[0]?.provider_id,
                                clientType: addingItemTo.items[0]?.client_type,
                                remisionReference: addingItemTo.items[0]?.remision_reference,
                                fromBranchId: addingItemTo.items[0]?.from_branch_id || branches?.find((b: any) => b.name === addingItemTo.branchName)?.id,
                                toBranchId: addingItemTo.items[0]?.to_branch_id,
                                date: addingItemTo.date,
                                comment: addingItemTo.comment,
                                products: [
                                    ...addingItemTo.items.map((item: any, i: number) => ({
                                        product_id: item.product_id,
                                        quantity: item.quantity,
                                        price_at_transaction: item.price_at_transaction,
                                        isExisting: true,
                                        tempId: `existing-${item.id || i}`
                                    })),
                                    { product_id: "", quantity: "", price_at_transaction: "", tempId: `new-${Date.now()}` }
                                ]
                            } : null}
                        />
                    </DialogContent>
                </Dialog>

                {/* QUICK ADD ITEM DIALOG */}
                {itemToAddAround && (
                    <AddItemDialog
                        open={!!itemToAddAround}
                        onOpenChange={(open) => !open && setItemToAddAround(null)}
                        targetItem={itemToAddAround.targetItem}
                        group={itemToAddAround.group}
                        onSuccess={() => {
                            setItemToAddAround(null);
                            // Optional: refetch or invalidate queries is handled by the hook
                        }}
                    />
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Label className="text-xs font-semibold mb-1 block">Buscar</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Producto, sucursal, remisión..."
                                className="pl-9 h-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-48">
                        <Label className="text-xs font-semibold mb-1 block">Sede / Seccional</Label>
                        <Select value={branchFilter} onValueChange={setBranchFilter}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Todas las sedes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las sedes</SelectItem>
                                {branches?.map((b: any) => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full md:w-48">
                        <Label className="text-xs font-semibold mb-1 block">Cliente / Proveedor</Label>
                        <Input
                            placeholder="Nombre..."
                            className="h-10"
                            value={clientFilter}
                            onChange={(e) => setClientFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                        <div>
                            <Label className="text-xs font-semibold mb-1 block">Desde</Label>
                            <Input
                                type="date"
                                className="h-10"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold mb-1 block">Hasta</Label>
                            <Input
                                type="date"
                                className="h-10"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pb-0.5">
                        {[
                            { id: 'inflow', label: 'Entradas', color: 'bg-green-100 text-green-800' },
                            { id: 'outflow', label: 'Salidas', color: 'bg-red-100 text-red-800' },
                            { id: 'transfer', label: 'Traslados', color: 'bg-blue-100 text-blue-800' },
                            { id: 'conversion', label: 'Conversiones', color: 'bg-purple-100 text-purple-800' },
                            { id: 'adjustment', label: 'Ajustes', color: 'bg-amber-100 text-amber-800' },
                        ].map((type) => {
                            const isSelected = typeFilters.includes(type.id);
                            return (
                                <Button
                                    key={type.id}
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "rounded-full h-9",
                                        isSelected ? "" : "text-gray-500 border-gray-200"
                                    )}
                                    onClick={() => {
                                        setTypeFilters(prev =>
                                            prev.includes(type.id)
                                                ? prev.filter(t => t !== type.id)
                                                : [...prev, type.id]
                                        );
                                        setCurrentPage(1);
                                    }}
                                >
                                    {type.label}
                                </Button>
                            );
                        })}
                        {(typeFilters.length > 0 || searchTerm || dateFrom || dateTo || branchFilter !== "all" || clientFilter) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-red-500 h-9"
                                onClick={() => {
                                    setTypeFilters([]);
                                    setSearchTerm("");
                                    setDateFrom("");
                                    setDateTo("");
                                    setBranchFilter("all");
                                    setClientFilter("");
                                }}
                            >
                                <RefreshCw className="w-3 h-3 mr-1" /> Limpiar
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Remisión</TableHead>
                            <TableHead>Sucursal</TableHead>
                            <TableHead className="text-right">Productos</TableHead>
                            <TableHead>Proveedor/Detalle</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : filteredMovements?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No se encontraron movimientos.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedMovements?.map((group) => {
                                const isExpanded = expandedRows.has(group.id);
                                return (
                                    <React.Fragment key={group.id}>
                                        <TableRow
                                            className="cursor-pointer hover:bg-gray-50"
                                            onClick={() => toggleRow(group.id)}
                                        >
                                            <TableCell>
                                                {group.totalProducts > 1 ? (
                                                    isExpanded ?
                                                        <ChevronDown className="w-4 h-4 text-gray-500" /> :
                                                        <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                                                ) : null}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getMovementIcon(group.type)}
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMovementColor(group.type)}`}>
                                                        {getMovementLabel(group.type)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {group.date ? format(new Date(group.date), "dd/MM/yyyy HH:mm", { locale: es }) : "-"}
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">{group.remissionNumber}</TableCell>
                                            <TableCell className="text-sm text-gray-600">{group.branchName}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Package className="w-3 h-3 text-gray-400" />
                                                    <span className="font-bold text-blue-600">{group.totalProducts}</span>
                                                    {group.totalProducts > 1 && (
                                                        <span className="text-xs text-gray-500">items</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                                                {group.providerName || group.comment || "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteRemission(group);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        {/* Expanded rows showing products */}
                                        {isExpanded && group.items.map((item, idx) => (
                                            <TableRow key={`${item.id}`} className="bg-gray-50/50">
                                                <TableCell></TableCell>
                                                <TableCell colSpan={2} className="pl-8">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Package className="w-3 h-3 text-gray-400" />
                                                        <span className="font-medium">{item.product_name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">
                                                    {item.price_at_transaction ?
                                                        `$${Number(item.price_at_transaction).toLocaleString('es-CO')}` :
                                                        '-'
                                                    }
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    <span className={(item.quantity >= 0 && (item.type === "inflow" || item.type === "adjustment")) ? "text-green-600" : "text-red-600"}>
                                                        {item.quantity > 0 ? "+" : ""}{item.quantity}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs text-gray-500 truncate max-w-[150px]">
                                                    {item.comment || "-"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-green-600 hover:text-green-800 hover:bg-green-50"
                                                            title="Añadir ítem a esta remisión"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setItemToAddAround({ targetItem: item, group });
                                                            }}
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditClick(item);
                                                            }}
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-600 hover:text-red-800 hover:bg-red-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(item.id);
                                                            }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
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

            {/* Edit Dialog */}
            <Dialog open={!!editingMovement} onOpenChange={(open) => !open && setEditingMovement(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Editar Movimiento</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-primary">{editingMovement?.product_name}</p>
                            <p className="text-xs text-muted-foreground">{editingMovement?.branch_name} - {getMovementLabel(editingMovement?.type)}</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="quantity">Cantidad</Label>
                            <Input
                                id="quantity"
                                type="number"
                                step="0.01"
                                value={editData.quantity}
                                onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="price">Precio/Costo Unitario</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                value={editData.priceAtTransaction}
                                onChange={(e) => setEditData({ ...editData, priceAtTransaction: e.target.value })}
                            />
                        </div>
                        {editingMovement?.type === 'transfer' && (
                            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
                                <ArrowRightLeft className="w-3 h-3 inline mr-1" />
                                Este movimiento es parte de un traslado. Recuerda editar también el movimiento de pareja para mantener la consistencia.
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingMovement(null)}>Cancelar</Button>
                        <Button onClick={handleUpdate} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Pagination Controls */}
            {filteredMovements && filteredMovements.length > 0 && (
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

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Search, Loader2, Plus, ChevronLeft, ChevronRight, ClipboardCheck, AlertTriangle, Eye, CheckCircle2, History, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useInventoryCounts, useBranches, useCreateInventoryCount, useStockMovements, useProducts, useDeleteInventoryCount } from "@/hooks/use-api";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InventoryCountsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // New count form state
    const [newBranchId, setNewBranchId] = useState("");
    const [newResponsible, setNewResponsible] = useState("");
    const [newNotes, setNewNotes] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const { data: counts, isLoading } = useInventoryCounts();
    const { data: branches } = useBranches();
    const { data: products } = useProducts();
    const { data: allMovements } = useStockMovements();
    const createCount = useCreateInventoryCount();
    const deleteCount = useDeleteInventoryCount();

    const handleCreateCount = async () => {
        if (!newBranchId || !newResponsible) {
            toast.error("Por favor completa los campos obligatorios");
            return;
        }

        setIsCreating(true);
        try {
            const branch = branches?.find(b => b.id === newBranchId);

            // Calculate theoretical stock for this branch
            const theoreticalStock = calculateTheoreticalStock(newBranchId);

            const payload = {
                branchId: newBranchId,
                branchName: branch?.name,
                responsible: newResponsible,
                notes: newNotes,
                items: theoreticalStock // Array of { productId, productName, theoreticalQuantity }
            };

            const result = await createCount.mutateAsync(payload);
            toast.success("Corte de inventario iniciado correctamente");
            setIsDialogOpen(false);
            router.push(`/inventory-counts/${result.id}`);
            setNewBranchId("");
            setNewResponsible("");
            setNewNotes("");
        } catch (error) {
            toast.error("Error al iniciar el corte");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteCount = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este corte de inventario? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            await deleteCount.mutateAsync(id);
            toast.success("Corte de inventario eliminado correctamente");
        } catch (error) {
            toast.error("Error al eliminar el corte");
        }
    };

    const calculateTheoreticalStock = (branchId: string) => {
        if (!allMovements || !products || !counts) return [];

        // 1. Find the last applied count for this branch to use as baseline
        const lastAppliedCount = counts
            .filter(c => c.branch_id === branchId && c.adjustments_applied)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        const lastCountDate = lastAppliedCount ? new Date(lastAppliedCount.date) : new Date(0);

        return [...products]
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
            .map(p => {
                const productMovements = allMovements.filter(m => m.product_id === p.id && m.branch_id === branchId);

                let initial = 0;
                let inflows = 0;
                let outflows = 0;

                productMovements.forEach(m => {
                    const mDate = new Date(m.date);
                    const isInitialMovement = m.comment?.toLowerCase().includes('inicial') || m.comment?.toLowerCase().includes('initial');
                    const qty = Number(m.quantity);

                    const isAddition = m.type === 'inflow' || ((m.type === 'transfer' || m.type === 'conversion' || m.type === 'adjustment') && qty > 0);
                    const isSubtraction = m.type === 'outflow' || ((m.type === 'transfer' || m.type === 'conversion' || m.type === 'adjustment') && qty < 0);

                    if (mDate <= lastCountDate) {
                        // Sum up everything before or at the last count date
                        if (isAddition) initial += Math.abs(qty);
                        else if (isSubtraction) initial -= Math.abs(qty);
                    } else if (isInitialMovement && !lastAppliedCount) {
                        // If it's the FIRST count, treat movements with "inicial" in comment as initial stock
                        if (isAddition) initial += Math.abs(qty);
                        else if (isSubtraction) initial -= Math.abs(qty);
                    } else {
                        // Regular movements after the last count
                        if (isAddition) inflows += Math.abs(qty);
                        else if (isSubtraction) outflows += Math.abs(qty);
                    }
                });

                return {
                    productId: p.id,
                    productName: p.name,
                    initialQuantity: initial,
                    inflowQuantity: inflows,
                    outflowQuantity: outflows,
                    theoreticalQuantity: initial + inflows - outflows
                };
            });
    };

    const filteredCounts = (counts || []).filter(count => {
        const matchesSearch =
            count.branch_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            count.responsible?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || count.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredCounts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCounts = filteredCounts.slice(startIndex, endIndex);

    const getStatusBadge = (status: string, adjustmentsApplied: boolean) => {
        if (adjustmentsApplied) {
            return <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><CheckCircle2 className="w-3 h-3" /> Ajustado</span>;
        }
        if (status === "completado") {
            return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Cerrado</span>;
        }
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Abierto</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Cortes de Inventario</h1>
                    <p className="text-muted-foreground">Control físico de existencias y cuadre de stock.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="font-bold gap-2">
                            <Plus className="h-4 w-4" /> Nuevo Corte
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Iniciar Nuevo Corte</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Sucursal</Label>
                                <Select value={newBranchId} onValueChange={setNewBranchId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches?.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Responsable del Conteo</Label>
                                <Input
                                    placeholder="Nombre de la persona"
                                    value={newResponsible}
                                    onChange={(e) => setNewResponsible(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Observaciones (Opcional)</Label>
                                <Input
                                    placeholder="Notas adicionales..."
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                />
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900 mt-2">
                                <AlertTriangle className="w-4 h-4 inline mr-2 mb-1" />
                                Al iniciar un corte, el sistema tomará una foto del inventario teórico actual para comparar.
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreateCount} disabled={isCreating || !newBranchId || !newResponsible}>
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Iniciar Corte"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="border rounded-lg p-4 bg-white shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                        <History className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-sm text-gray-500">Total Cortes</div>
                        <div className="text-xl font-bold">{counts?.length || 0}</div>
                    </div>
                </div>
                <div className="border rounded-lg p-4 bg-white shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 rounded-full text-yellow-600">
                        <Loader2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-sm text-gray-500">En Progreso</div>
                        <div className="text-xl font-bold">{counts?.filter(c => c.status === 'en progreso').length || 0}</div>
                    </div>
                </div>
                <div className="border rounded-lg p-4 bg-white shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-full text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-sm text-gray-500">Cerrados</div>
                        <div className="text-xl font-bold">{counts?.filter(c => c.status === 'completado').length || 0}</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2 flex-1">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Buscar por sucursal o responsable..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] bg-white">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="en progreso">En Progreso (Abiertos)</SelectItem>
                            <SelectItem value="completado">Completados (Cerrados)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-[150px]">Fecha</TableHead>
                            <TableHead>Sucursal</TableHead>
                            <TableHead>Responsable</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Diferencias</TableHead>
                            <TableHead className="w-[100px] text-center">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : filteredCounts?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <AlertTriangle className="w-8 h-8 opacity-20" />
                                        <p>No se encontraron registros para tu búsqueda.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedCounts?.map((count) => (
                                <TableRow key={count.id} className="hover:bg-gray-50 transition-colors">
                                    <TableCell className="text-sm font-medium text-gray-900">
                                        {count.date ? format(new Date(count.date), "dd MMM, yyyy", { locale: es }) : "-"}
                                    </TableCell>
                                    <TableCell className="font-semibold text-gray-700">{count.branch_name || "-"}</TableCell>
                                    <TableCell className="text-sm text-gray-600">{count.responsible || "-"}</TableCell>
                                    <TableCell>{getStatusBadge(count.status, count.adjustments_applied)}</TableCell>
                                    <TableCell className="text-right">
                                        {count.status === 'en progreso' ? (
                                            <span className="text-xs text-gray-400 italic">En conteo...</span>
                                        ) : (
                                            <span className={`font-bold ${count.differences_count > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {count.differences_count || 0}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link href={`/inventory-counts/${count.id}`}>
                                                <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDeleteCount(count.id)}
                                                disabled={deleteCount.isPending}
                                            >
                                                {deleteCount.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {filteredCounts && filteredCounts.length > 0 && (
                <div className="flex items-center justify-between px-2 text-sm text-gray-500">
                    <div>
                        Mostrando {startIndex + 1} - {Math.min(endIndex, filteredCounts.length)} de {filteredCounts.length} cortes
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-medium text-gray-900">{currentPage} de {totalPages}</span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
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

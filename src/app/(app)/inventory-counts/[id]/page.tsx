"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, Save, CheckCircle, AlertTriangle, Printer, Trash2 } from "lucide-react";
import { useInventoryCount, useUpdateInventoryCount, useApplyInventoryCount, useStockMovements, useProducts, useInventoryCounts } from "@/hooks/use-api";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { RefreshCw, Equal } from "lucide-react";

export default function InventoryCountDetailPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { data: countData, isLoading, refetch } = useInventoryCount(id);
    const updateCount = useUpdateInventoryCount();
    const applyAdjustments = useApplyInventoryCount();

    const [items, setItems] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);

    const { data: allMovements } = useStockMovements();
    const { data: products } = useProducts();
    const { data: counts } = useInventoryCounts();

    useEffect(() => {
        if (countData?.items) {
            const sorted = [...countData.items].sort((a, b) =>
                (a.product_name || "").localeCompare(b.product_name || "")
            );
            setItems(sorted);
        }
    }, [countData]);

    const handleQuantityChange = (itemId: string, val: string) => {
        const qty = parseFloat(val);
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const physicalQuantity = isNaN(qty) ? 0 : qty;
                return {
                    ...item,
                    physical_quantity: physicalQuantity,
                    difference: physicalQuantity - item.theoretical_quantity
                };
            }
            return item;
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateCount.mutateAsync({
                id,
                data: { items }
            });
            toast.success("Progreso guardado correctamente");
            refetch();
        } catch (error) {
            toast.error("Error al guardar los cambios");
        } finally {
            setIsSaving(false);
        }
    };

    const handleComplete = async () => {
        if (!confirm("¿Estás seguro de completar el conteo? Una vez completado no podrás editar las cantidades físicas.")) return;

        setIsSaving(true);
        try {
            await updateCount.mutateAsync({
                id,
                data: {
                    status: 'completado',
                    items: items
                }
            });
            toast.success("Conteo completado con éxito");
            refetch();
        } catch (error) {
            toast.error("Error al completar el conteo");
        } finally {
            setIsSaving(false);
        }
    };

    const handleApplyAdjustments = async () => {
        if (!confirm("Se generarán movimientos de ajuste en el inventario para igualar el stock teórico con el físico. ¿Continuar?")) return;

        setIsApplying(true);
        try {
            await applyAdjustments.mutateAsync(id);
            toast.success("Ajustes aplicados correctamente. El inventario ha sido actualizado.");
            refetch();
        } catch (error: any) {
            toast.error(error.message || "Error al aplicar los ajustes");
        } finally {
            setIsApplying(false);
        }
    };

    const handleRecalculate = async () => {
        if (!allMovements || !products || !counts || !countData) {
            toast.error("Faltan datos para recalcular. Asegúrate de que los movimientos y productos estén cargados.");
            return;
        }

        setIsRecalculating(true);
        try {
            const branchId = countData.branch_id;

            // 1. Find the last applied count BEFORE THIS ONE for this branch
            const lastAppliedCount = counts
                .filter(c => c.branch_id === branchId && c.adjustments_applied && c.id !== id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            const lastCountDate = lastAppliedCount ? new Date(lastAppliedCount.date) : new Date(0);

            const updatedItems = items.map(item => {
                const pMovements = allMovements.filter(m => m.product_id === item.product_id && m.branch_id === branchId);

                let initial = 0;
                let inflows = 0;
                let outflows = 0;

                pMovements.forEach(m => {
                    const mDate = new Date(m.date);
                    const isInitialMovement = m.comment?.toLowerCase().includes('inicial') || m.comment?.toLowerCase().includes('initial');
                    const mQty = Number(m.quantity);

                    const isAddition = m.type === 'inflow' || ((m.type === 'transfer' || m.type === 'conversion') && mQty > 0);
                    const isSubtraction = m.type === 'outflow' || ((m.type === 'transfer' || m.type === 'conversion') && mQty < 0);

                    if (mDate <= lastCountDate) {
                        if (isAddition) initial += Math.abs(mQty);
                        else if (isSubtraction) initial -= Math.abs(mQty);
                    } else if (isInitialMovement && !lastAppliedCount) {
                        if (isAddition) initial += Math.abs(mQty);
                        else if (isSubtraction) initial -= Math.abs(mQty);
                    } else {
                        // Regular movements after the last count
                        if (isAddition) inflows += Math.abs(mQty);
                        else if (isSubtraction) outflows += Math.abs(mQty);
                    }
                });

                const theoretical = initial + inflows - outflows;
                return {
                    ...item,
                    initial_quantity: initial,
                    inflow_quantity: inflows,
                    outflow_quantity: outflows,
                    theoretical_quantity: theoretical,
                    difference: (item.physical_quantity || 0) - theoretical
                };
            });

            const sortedItems = [...updatedItems].sort((a, b) =>
                (a.product_name || "").localeCompare(b.product_name || "")
            );
            setItems(sortedItems);
            toast.success("Cálculo teórico actualizado. Recuerda Guardar para persistir los cambios.");
        } catch (error) {
            console.error("Error recalcular:", error);
            toast.error("Error al recalcular datos teóricos");
        } finally {
            setIsRecalculating(false);
        }
    };

    const handleEqualize = () => {
        if (!confirm("¿Estás seguro de igualar todas las cantidades físicas con las teóricas? Esto sobrescribirá cualquier valor ingresado.")) return;

        setItems(prev => prev.map(item => ({
            ...item,
            physical_quantity: item.theoretical_quantity,
            difference: 0
        })));
        toast.success("Cantidades igualadas con el stock teórico. No olvides guardar cambios.");
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Cargando detalle del corte...</p>
            </div>
        );
    }

    const { status, adjustments_applied } = countData || {};
    const isCompleted = status === 'completado';
    const isAdjusted = adjustments_applied;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/inventory-counts">
                        <Button variant="outline" size="icon" className="rounded-full">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Corte: {countData?.branch_name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {countData?.date && format(new Date(countData.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    {!isCompleted && (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleRecalculate}
                                disabled={isSaving || isRecalculating}
                                className="flex-1 sm:flex-none border-blue-200 text-blue-700 hover:bg-blue-50"
                                title="Recalcular stock teórico basándose en movimientos recientes"
                            >
                                {isRecalculating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                Recalcular Teórico
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleEqualize}
                                disabled={isSaving || isRecalculating}
                                className="flex-1 sm:flex-none border-green-200 text-green-700 hover:bg-green-50"
                                title="Rellenar físico con los valores teóricos"
                            >
                                <Equal className="w-4 h-4 mr-2" />
                                Igualar con Teórico
                            </Button>
                            <Button variant="outline" onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Guardar
                            </Button>
                            <Button onClick={handleComplete} disabled={isSaving} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Finalizar Conteo
                            </Button>
                        </>
                    )}
                    {isCompleted && !isAdjusted && (
                        <Button onClick={handleApplyAdjustments} disabled={isApplying} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700">
                            {isApplying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                            Aplicar Ajustes
                        </Button>
                    )}
                    {(isAdjusted || isCompleted) && (
                        <Button variant="outline" onClick={() => window.print()} className="flex-1 sm:flex-none">
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir
                        </Button>
                    )}
                </div>
            </div>

            {/* Banner Status */}
            {isAdjusted ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3 text-blue-800">
                    <CheckCircle className="w-5 h-5" />
                    <p className="font-medium">Este corte ha sido aplicado. El stock teórico ha sido actualizado.</p>
                </div>
            ) : isCompleted ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <p className="font-medium">El conteo físico ha terminado. Revisa las diferencias antes de aplicar los ajustes.</p>
                </div>
            ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3 text-yellow-800">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="font-medium">Ingresa las cantidades físicas encontradas. El sistema calculará la diferencia automáticamente.</p>
                </div>
            )}

            {/* Info Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Responsable</div>
                    <div className="text-lg font-semibold">{countData?.responsible}</div>
                </div>
                <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Estado del Proceso</div>
                    <div className="text-lg font-semibold uppercase">{status}</div>
                </div>
                <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Ítems con Diferencia</div>
                    <div className="text-lg font-semibold text-orange-600">
                        {items.filter(i => i.difference !== 0).length} de {items.length}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-100/80">
                        <TableRow>
                            <TableHead className="font-bold">Producto</TableHead>
                            <TableHead className="text-right">Inicial</TableHead>
                            <TableHead className="text-right text-blue-600">Entradas (+)</TableHead>
                            <TableHead className="text-right text-red-600">Salidas (-)</TableHead>
                            <TableHead className="text-right font-bold bg-gray-50/50">Teórico</TableHead>
                            <TableHead className="text-right w-32">Físico</TableHead>
                            <TableHead className="text-right w-32">Diferencia</TableHead>
                            <TableHead className="text-right">Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => {
                            const hasDiff = item.difference !== 0;
                            return (
                                <TableRow key={item.id} className={hasDiff ? "bg-orange-50/20" : "hover:bg-gray-50/50"}>
                                    <TableCell className="font-semibold">{item.product_name}</TableCell>
                                    <TableCell className="text-right text-gray-500">
                                        {(item.initial_quantity || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right text-blue-600 font-medium">
                                        {(item.inflow_quantity || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right text-red-600 font-medium">
                                        {(item.outflow_quantity || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold bg-gray-50/50 border-x">
                                        {item.theoretical_quantity.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input
                                            type="number"
                                            value={item.physical_quantity || 0}
                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                            className={`text-right h-9 font-bold border-2 ${isCompleted ? 'bg-gray-100 border-transparent' : 'border-primary/20 focus:border-primary shadow-sm'}`}
                                            readOnly={isCompleted}
                                        />
                                    </TableCell>
                                    <TableCell className={`text-right font-bold text-lg ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                        {item.difference > 0 ? `+${item.difference.toFixed(2)}` : item.difference.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {hasDiff ? (
                                            <span className="text-[10px] px-2 py-1 rounded-full bg-orange-100 text-orange-800 font-black uppercase tracking-tighter">Descuadre</span>
                                        ) : (
                                            <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-800 font-black uppercase tracking-tighter">OK</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Floating Action Button (FAB) for Recalculate */}
            {!isCompleted && (
                <div className="fixed bottom-8 right-8 z-50 group flex items-center gap-2">
                    <span className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        Recalcular Stock Teórico
                    </span>
                    <Button
                        onClick={handleRecalculate}
                        disabled={isSaving || isRecalculating}
                        className="w-14 h-14 rounded-full shadow-[0_10px_40px_rgba(37,99,235,0.4)] bg-blue-600 hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white"
                    >
                        {isRecalculating ? (
                            <Loader2 className="w-7 h-7 animate-spin" />
                        ) : (
                            <RefreshCw className="w-7 h-7" />
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}

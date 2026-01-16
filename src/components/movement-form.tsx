"use client";

import { useState, useEffect } from "react";
import { useCreateStockMovement, useProducts, useBranches, useProviders, useUpdateRemission, useStockMovements } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Calculator, ArrowRightLeft, Save, FileText, LogOut, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { getColombiaDate } from "@/lib/utils";

interface MovementFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    initialData?: any; // Data for editing
}

export function MovementForm({ onSuccess, onCancel, onDirtyChange, initialData }: MovementFormProps) {
    const [productSearch, setProductSearch] = useState("");
    const { data: products } = useProducts();
    const { data: branches } = useBranches();
    const { data: providers } = useProviders();
    const createMovement = useCreateStockMovement();
    const updateRemission = useUpdateRemission();
    const { data: movements } = useStockMovements();

    const [activeTab, setActiveTab] = useState("inflow");
    const [isDirty, setIsDirty] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    const predefinedClients = [
        "Carlos Mancipe",
        "Rafael Velandia",
        "Camilo Jiménez",
        "Fedeagro"
    ];

    const generateNextId = (prefix: string) => {
        if (!movements) return `${prefix}-0001`;

        const pattern = new RegExp(`^${prefix}-(\\d{4})$`);
        const numbers = movements
            .map((m: any) => m.remission_number?.match(pattern))
            .filter((match: any) => match)
            .map((match: any) => parseInt(match[1]));

        const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
    };

    // Inflow state
    const [inflowData, setInflowData] = useState({
        date: getColombiaDate(),
        remissionNumber: "",
        branchId: "",
        providerId: "",
        dueDate: "",
        comment: "",
        products: [{ productId: "", quantity: "", priceAtTransaction: "", isExisting: false, tempId: `init-${Date.now()}` }]
    });

    // Outflow state
    const [outflowData, setOutflowData] = useState({
        date: getColombiaDate(),
        remissionNumber: "",
        branchId: "",
        clientType: "mostrador",
        electronicInvoiceNumber: "",
        remisionReference: "",
        comment: "",
        products: [{ productId: "", quantity: "", priceAtTransaction: "", isExisting: false, tempId: `init-${Date.now()}` }]
    });

    // Transfer state
    const [transferData, setTransferData] = useState({
        date: getColombiaDate(),
        remissionNumber: "",
        fromBranchId: "",
        toBranchId: "",
        comment: "",
        products: [{ productId: "", quantity: "", priceAtTransaction: "", isExisting: false, tempId: `init-${Date.now()}` }]
    });

    const [conversionData, setConversionData] = useState({
        date: getColombiaDate(),
        remissionNumber: "",
        branchId: "",
        fromProductId: "",
        fromQuantity: "",
        toProductId: "",
        toQuantity: "",
        priceAtTransaction: "",
        comment: ""
    });

    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        if (initialData) {
            setIsInitialLoad(true);
            const { type, products: initialProducts, ...rest } = initialData;
            setActiveTab(type || "inflow");

            const formattedProducts = (initialProducts || []).map((p: any) => ({
                productId: p.product_id || p.productId || "",
                quantity: String(Math.abs(p.quantity || 0)),
                priceAtTransaction: String(p.price_at_transaction || p.priceAtTransaction || 0),
                isExisting: p.isExisting || false,
                tempId: p.tempId || `row-${Math.random().toString(36).substr(2, 9)}`
            }));

            const baseData = {
                date: rest.date || getColombiaDate(),
                remissionNumber: rest.remissionNumber || rest.remission_number || "",
                branchId: rest.branchId || rest.branch_id || "",
                comment: rest.comment || "",
                products: formattedProducts.length > 0 ? formattedProducts : [{ productId: "", quantity: "", priceAtTransaction: "", tempId: `row-${Date.now()}` }]
            };

            if (type === "inflow") setInflowData({ ...baseData, providerId: rest.providerId || rest.provider_id || "", dueDate: rest.dueDate || "" });
            if (type === "outflow") setOutflowData({ ...baseData, clientType: rest.clientType || "mostrador", electronicInvoiceNumber: rest.electronicInvoiceNumber || "", remisionReference: rest.remisionReference || "" });
            if (type === "transfer") setTransferData({ ...baseData, fromBranchId: rest.fromBranchId || rest.branch_id || "", toBranchId: rest.toBranchId || "" });
            if (type === "conversion") setConversionData({
                date: rest.date || getColombiaDate(),
                remissionNumber: rest.remissionNumber || rest.remission_number || "",
                branchId: rest.branchId || rest.branch_id || "",
                fromProductId: rest.fromProductId || "",
                fromQuantity: String(Math.abs(rest.fromQuantity || 0)),
                toProductId: rest.toProductId || "",
                toQuantity: String(Math.abs(rest.toQuantity || 0)),
                priceAtTransaction: String(rest.priceAtTransaction || 0),
                comment: rest.comment || ""
            });

            // Allow state to settle before enabling dirty check
            setTimeout(() => setIsInitialLoad(false), 500);
        } else {
            setIsInitialLoad(false);
        }
    }, [initialData]);

    useEffect(() => {
        if (!isInitialLoad) {
            setIsDirty(true);
            onDirtyChange?.(true);
        }
    }, [inflowData, outflowData, transferData, conversionData]);

    // Initialize state even without initialData to ensure tempIds
    useEffect(() => {
        if (!initialData) {
            setInflowData(prev => ({ ...prev, products: [{ ...prev.products[0], tempId: `row-${Date.now()}` }] }));
            setOutflowData(prev => ({ ...prev, products: [{ ...prev.products[0], tempId: `row-${Date.now()}` }] }));
            setTransferData(prev => ({ ...prev, products: [{ ...prev.products[0], tempId: `row-${Date.now()}` }] }));
        }
    }, []);

    // Auto ID for Conversions
    useEffect(() => {
        if (activeTab === "conversion" && !conversionData.remissionNumber) {
            setConversionData(prev => ({ ...prev, remissionNumber: generateNextId("CON") }));
        }
        if (activeTab === "outflow" && outflowData.clientType === "mostrador" && !outflowData.remissionNumber) {
            setOutflowData(prev => ({ ...prev, remissionNumber: generateNextId("SAL") }));
        }
    }, [activeTab, movements, outflowData.clientType]);

    const [showedTotal, setShowedTotal] = useState<number | null>(null);

    const calculateCurrentTotal = () => {
        const total = outflowData.products.reduce((sum, p) => {
            const qty = parseFloat(p.quantity) || 0;
            const price = parseFloat(p.priceAtTransaction) || 0;
            return sum + (qty * price);
        }, 0);
        setShowedTotal(total);
    };

    const handleInflowSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const branch = branches?.find(b => b.id === inflowData.branchId);
        const provider = providers?.find(p => p.id === inflowData.providerId);
        const branchName = branch?.name;
        const providerName = provider?.name;

        const payload = {
            type: "inflow",
            date: inflowData.date,
            remissionNumber: inflowData.remissionNumber,
            branchId: inflowData.branchId,
            branchName: branchName,
            providerId: inflowData.providerId,
            providerName: providerName,
            dueDate: inflowData.dueDate,
            comment: inflowData.comment,
            products: inflowData.products
                .filter(p => !p.isExisting) // ONLY SEND NEW ITEMS
                .map(p => {
                    const productDetails = products?.find(prod => prod.id === p.productId);
                    return {
                        productId: p.productId,
                        productName: productDetails?.name,
                        quantity: Number(p.quantity),
                        priceAtTransaction: Number(p.priceAtTransaction || 0)
                    };
                })
        };

        if (payload.products.length === 0) {
            toast.info("No hay productos nuevos para añadir.");
            return;
        }

        try {
            await createMovement.mutateAsync(payload);
            setIsDirty(false); // Reset dirty on success
            toast.success("Entrada registrada exitosamente");
            onSuccess();
        } catch (error) {
            toast.error("Error al registrar entrada");
        }
    };

    const handleSaveDraft = async () => {
        let currentData: any = null;
        let type = activeTab;

        if (activeTab === "inflow") currentData = inflowData;
        else if (activeTab === "outflow") currentData = outflowData;
        else if (activeTab === "transfer") currentData = transferData;
        else if (activeTab === "conversion") currentData = conversionData;

        if (!currentData) return;

        // Validation for Database Compliance (Drafts still need valid DB keys)
        const hasBranch = currentData.branchId || currentData.fromBranchId;
        const validProducts = Array.isArray(currentData.products)
            ? currentData.products.filter((p: any) => p.productId && p.productId.trim() !== '')
            : [];

        if (!hasBranch || validProducts.length === 0) {
            toast.error("Para guardar un borrador, selecciona al menos una Sucursal y un Producto válido.");
            setShowExitConfirm(false); // Close confirmation to let them fix it
            return;
        }

        const payload = {
            ...currentData,
            type: activeTab,
            comment: `[BORRADOR] ${currentData.comment || ""}`,
            products: validProducts.map((p: any) => {
                const product = products?.find(prod => prod.id === p.productId);
                return {
                    productId: p.productId,
                    productName: product?.name || "Desconocido",
                    quantity: Number(p.quantity) || 0,
                    priceAtTransaction: Number(p.priceAtTransaction) || 0
                };
            })
        };

        try {
            await createMovement.mutateAsync(payload);
            toast.success("Borrador guardado exitosamente");
            setIsDirty(false);
            setShowExitConfirm(false);
            onSuccess();
        } catch (error: any) {
            toast.error("Error al guardar borrador: " + error.message);
        }
    };

    const handleOutflowSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const branch = branches?.find(b => b.id === outflowData.branchId);

        const payload = {
            type: "outflow",
            date: outflowData.date,
            remissionNumber: outflowData.remissionNumber,
            branchId: outflowData.branchId,
            branchName: branch?.name,
            clientType: outflowData.clientType,
            electronicInvoiceNumber: outflowData.electronicInvoiceNumber,
            remisionReference: outflowData.remisionReference,
            comment: outflowData.comment,
            products: outflowData.products
                .filter(p => !p.isExisting) // ONLY SEND NEW ITEMS
                .map(p => {
                    const productDetails = products?.find(prod => prod.id === p.productId);
                    return {
                        productId: p.productId,
                        productName: productDetails?.name,
                        quantity: Number(p.quantity) * -1,
                        priceAtTransaction: Number(p.priceAtTransaction || 0)
                    };
                })
        };

        if (payload.products.length === 0) {
            toast.info("No hay productos nuevos para añadir.");
            return;
        }

        try {
            await createMovement.mutateAsync(payload);
            toast.success("Salida registrada exitosamente");
            onSuccess();
        } catch (error) {
            toast.error("Error al registrar salida");
        }
    };

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const fromBranch = branches?.find(b => b.id === transferData.fromBranchId);
        const toBranch = branches?.find(b => b.id === transferData.toBranchId);

        const payload = {
            type: "transfer",
            date: transferData.date,
            remissionNumber: transferData.remissionNumber,
            fromBranchId: transferData.fromBranchId,
            fromBranchName: fromBranch?.name,
            toBranchId: transferData.toBranchId,
            toBranchName: toBranch?.name,
            comment: transferData.comment,
            products: transferData.products
                .filter(p => !p.isExisting) // ONLY SEND NEW ITEMS
                .map(p => {
                    const productDetails = products?.find(prod => prod.id === p.productId);
                    return {
                        productId: p.productId,
                        productName: productDetails?.name,
                        quantity: Number(p.quantity),
                        priceAtTransaction: Number(p.priceAtTransaction || 0)
                    };
                })
        };

        if (payload.products.length === 0) {
            toast.info("No hay productos nuevos para añadir.");
            return;
        }

        try {
            await createMovement.mutateAsync(payload);
            toast.success("Traslado registrado exitosamente");
            onSuccess();
        } catch (error) {
            toast.error("Error al registrar traslado");
        }
    };

    const handleConversionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const branch = branches?.find(b => b.id === conversionData.branchId);
        const fromProduct = products?.find(p => p.id === conversionData.fromProductId);
        const toProduct = products?.find(p => p.id === conversionData.toProductId);

        const payload = {
            type: "conversion",
            date: conversionData.date,
            remissionNumber: conversionData.remissionNumber,
            branchId: conversionData.branchId,
            branchName: branch?.name,
            fromProductId: conversionData.fromProductId,
            fromProductName: fromProduct?.name,
            fromQuantity: Number(conversionData.fromQuantity),
            toProductId: conversionData.toProductId,
            toProductName: toProduct?.name,
            toQuantity: Number(conversionData.toQuantity),
            priceAtTransaction: Number(conversionData.priceAtTransaction || 0),
            comment: conversionData.comment
        };

        try {
            await createMovement.mutateAsync(payload);
            toast.success("Conversión registrada exitosamente");
            onSuccess();
        } catch (error) {
            toast.error("Error al registrar conversión");
        }
    };

    const addInflowProduct = () => {
        setInflowData({
            ...inflowData,
            products: [...inflowData.products, { productId: "", quantity: "", priceAtTransaction: "", isExisting: false, tempId: `row-${Date.now()}` }]
        });
    };

    const removeInflowProduct = (index: number) => {
        setInflowData({
            ...inflowData,
            products: inflowData.products.filter((_, i) => i !== index)
        });
    };

    const addOutflowProduct = () => {
        setOutflowData({
            ...outflowData,
            products: [...outflowData.products, { productId: "", quantity: "", priceAtTransaction: "", isExisting: false, tempId: `row-${Date.now()}` }]
        });
    };

    const removeOutflowProduct = (index: number) => {
        setOutflowData({
            ...outflowData,
            products: outflowData.products.filter((_, i) => i !== index)
        });
    };

    const insertOutflowProduct = (index: number) => {
        const newProducts = [...outflowData.products];
        newProducts.splice(index + 1, 0, { productId: "", quantity: "", priceAtTransaction: "", isExisting: false, tempId: `row-${Date.now()}` });
        setOutflowData({ ...outflowData, products: newProducts });
    };

    const insertInflowProduct = (index: number) => {
        const newProducts = [...inflowData.products];
        newProducts.splice(index + 1, 0, { productId: "", quantity: "", priceAtTransaction: "", isExisting: false, tempId: `row-${Date.now()}` });
        setInflowData({ ...inflowData, products: newProducts });
    };

    const insertTransferProduct = (index: number) => {
        const newProducts = [...transferData.products];
        newProducts.splice(index + 1, 0, { productId: "", quantity: "", priceAtTransaction: "", isExisting: false, tempId: `row-${Date.now()}` });
        setTransferData({ ...transferData, products: newProducts });
    };

    const addTransferProduct = () => {
        setTransferData({
            ...transferData,
            products: [...transferData.products, { productId: "", quantity: "", priceAtTransaction: "", isExisting: false, tempId: `row-${Date.now()}` }]
        });
    };

    const removeTransferProduct = (index: number) => {
        setTransferData({
            ...transferData,
            products: transferData.products.filter((_, i) => i !== index)
        });
    };

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="inflow" disabled={!!initialData && activeTab !== "inflow"}>Entrada</TabsTrigger>
                <TabsTrigger value="outflow" disabled={!!initialData && activeTab !== "outflow"}>Salida</TabsTrigger>
                <TabsTrigger value="transfer" disabled={!!initialData && activeTab !== "transfer"}>Traslado</TabsTrigger>
                <TabsTrigger value="conversion" disabled={!!initialData && activeTab !== "conversion"}>Conversión</TabsTrigger>
            </TabsList>

            {/* INFLOW TAB */}
            <TabsContent value="inflow">
                <form onSubmit={handleInflowSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Fecha y Hora</Label>
                            <Input
                                type="datetime-local"
                                value={inflowData.date}
                                onChange={(e) => setInflowData({ ...inflowData, date: e.target.value })}
                                required
                                disabled={!!initialData}
                            />
                        </div>
                        <div>
                            <Label>Número de Remisión</Label>
                            <Input
                                value={inflowData.remissionNumber}
                                onChange={(e) => setInflowData({ ...inflowData, remissionNumber: e.target.value })}
                                placeholder="Ej. REM-001"
                                required
                                disabled={!!initialData}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Sucursal</Label>
                            <Select
                                value={inflowData.branchId}
                                onValueChange={(v) => setInflowData({ ...inflowData, branchId: v })}
                                disabled={!!initialData}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sucursal" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches?.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Proveedor</Label>
                            <Select
                                value={inflowData.providerId}
                                onValueChange={(v) => setInflowData({ ...inflowData, providerId: v })}
                                disabled={!!initialData}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar proveedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {providers?.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-base font-semibold">Productos</Label>
                            <Button type="button" size="sm" variant="outline" onClick={addInflowProduct}>
                                <Plus className="w-4 h-4 mr-1" /> Agregar
                            </Button>
                        </div>
                        {inflowData.products.map((product, index) => (
                            <div key={product.tempId} className={`grid grid-cols-12 gap-3 items-end border-b pb-4 ${product.isExisting ? 'opacity-60 bg-gray-50/50' : ''}`}>
                                <div className="col-span-6">
                                    <Label className="text-xs">Producto {product.isExisting && "(Existente)"}</Label>
                                    <Select
                                        value={product.productId}
                                        disabled={product.isExisting}
                                        onValueChange={(v) => {
                                            const p = products?.find(prod => prod.id === v);
                                            // Assuming updateInflowProduct is a helper function defined elsewhere
                                            // For now, directly update state as per original pattern
                                            const newProducts = [...inflowData.products];
                                            newProducts[index].productId = v;
                                            newProducts[index].priceAtTransaction = String(p?.purchase_price || 0);
                                            setInflowData({ ...inflowData, products: newProducts });
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleccionar producto" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={5} className="w-[--radix-select-trigger-width]">
                                            <div className="p-2 border-b" onKeyDown={(e) => e.stopPropagation()}>
                                                <Input
                                                    placeholder="Buscar producto..."
                                                    value={productSearch}
                                                    onChange={(e) => setProductSearch(e.target.value)}
                                                    className="h-8 text-xs"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="max-h-[300px] overflow-auto">
                                                {products
                                                    ?.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                                                    ?.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                            </div>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs">Cant.</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={product.quantity}
                                        disabled={product.isExisting}
                                        onChange={(e) => {
                                            const newProducts = [...inflowData.products];
                                            newProducts[index].quantity = e.target.value;
                                            setInflowData({ ...inflowData, products: newProducts });
                                        }}
                                        required
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs">Costo Unitario (FIFO)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={product.priceAtTransaction}
                                        disabled={product.isExisting}
                                        onChange={(e) => {
                                            const newProducts = [...inflowData.products];
                                            newProducts[index].priceAtTransaction = e.target.value;
                                            setInflowData({ ...inflowData, products: newProducts });
                                        }}
                                        required
                                    />
                                </div>
                                <div className="col-span-1 flex gap-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-9 w-9 p-0 text-blue-600 hover:bg-blue-50"
                                        onClick={() => insertInflowProduct(index)}
                                        title="Insertar debajo"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                    {inflowData.products.length > 1 && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-9 w-9 p-0 text-red-600 hover:bg-red-50"
                                            onClick={() => removeInflowProduct(index)}
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <Label>Fecha de Vencimiento (Opcional)</Label>
                            <Input
                                type="date"
                                value={inflowData.dueDate}
                                onChange={(e) => setInflowData({ ...inflowData, dueDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Comentarios</Label>
                        <Textarea
                            value={inflowData.comment}
                            onChange={(e) => setInflowData({ ...inflowData, comment: e.target.value })}
                            placeholder="Observaciones adicionales..."
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={createMovement.isPending}>
                        {createMovement.isPending && <Loader2 className="animate-spin mr-2" />}
                        Registrar Entrada
                    </Button>
                </form>
            </TabsContent>

            {/* OUTFLOW TAB */}
            <TabsContent value="outflow">
                <form onSubmit={handleOutflowSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Fecha y Hora</Label>
                            <Input
                                type="datetime-local"
                                value={outflowData.date}
                                onChange={(e) => setOutflowData({ ...outflowData, date: e.target.value })}
                                required
                                disabled={!!initialData}
                            />
                        </div>
                        <div>
                            <Label>Número de Remisión</Label>
                            <Input
                                value={outflowData.remissionNumber}
                                onChange={(e) => setOutflowData({ ...outflowData, remissionNumber: e.target.value })}
                                placeholder="Ej. SAL-001"
                                required
                                disabled={!!initialData}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Sucursal</Label>
                        <Select
                            value={outflowData.branchId}
                            onValueChange={(v) => setOutflowData({ ...outflowData, branchId: v })}
                            disabled={!!initialData}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar sucursal" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches?.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Cliente / Destino</Label>
                        <Select
                            value={outflowData.clientType}
                            onValueChange={(v) => {
                                // De acuerdo a la solicitud: cuando cambien de cliente, el campo remision se borra
                                setOutflowData({ ...outflowData, clientType: v, remissionNumber: "" });
                            }}
                            disabled={!!initialData}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar cliente o tipo" />
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={5}>
                                <SelectItem value="mostrador">Venta en Mostrador (Auto-ID)</SelectItem>
                                <SelectItem value="remision">Remisión Genérica</SelectItem>
                                {predefinedClients.map(client => (
                                    <SelectItem key={client} value={client}>{client}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {outflowData.clientType === "remision" && (
                        <div>
                            <Label>Referencia de Remisión / Nombre Cliente</Label>
                            <Input
                                value={outflowData.remisionReference}
                                onChange={(e) => setOutflowData({ ...outflowData, remisionReference: e.target.value })}
                                placeholder="Ej. Cliente XYZ"
                                disabled={!!initialData}
                            />
                        </div>
                    )}

                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-base font-semibold">Productos</Label>
                            <Button type="button" size="sm" variant="outline" onClick={addOutflowProduct}>
                                <Plus className="w-4 h-4 mr-1" /> Agregar
                            </Button>
                        </div>
                        {outflowData.products.map((product, index) => (
                            <div key={product.tempId} className={`grid grid-cols-12 gap-3 items-end border-b pb-4 ${product.isExisting ? 'opacity-60 bg-gray-50/50' : ''}`}>
                                <div className="col-span-6">
                                    <Label className="text-xs">Producto {product.isExisting && "(Existente)"}</Label>
                                    <Select
                                        value={product.productId}
                                        disabled={product.isExisting}
                                        onValueChange={(v) => {
                                            const selectedProduct = products?.find(p => p.id === v);
                                            const newProducts = [...outflowData.products];
                                            newProducts[index].productId = v;
                                            if (selectedProduct) {
                                                newProducts[index].priceAtTransaction = String(selectedProduct.price || 0);
                                            }
                                            setOutflowData({ ...outflowData, products: newProducts });
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleccionar producto" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={5} className="w-[--radix-select-trigger-width]">
                                            <div className="p-2 border-b" onKeyDown={(e) => e.stopPropagation()}>
                                                <Input
                                                    placeholder="Buscar producto..."
                                                    value={productSearch}
                                                    onChange={(e) => setProductSearch(e.target.value)}
                                                    className="h-8 text-xs"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="max-h-[300px] overflow-auto">
                                                {products
                                                    ?.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                                                    ?.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                            </div>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs">Cant.</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={product.quantity}
                                        onChange={(e) => {
                                            const newProducts = [...outflowData.products];
                                            newProducts[index].quantity = e.target.value;
                                            setOutflowData({ ...outflowData, products: newProducts });
                                        }}
                                        required
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs">Precio Unit.</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={product.priceAtTransaction}
                                        onChange={(e) => {
                                            const newProducts = [...outflowData.products];
                                            newProducts[index].priceAtTransaction = e.target.value;
                                            setOutflowData({ ...outflowData, products: newProducts });
                                        }}
                                        required
                                    />
                                </div>
                                <div className="col-span-1 flex gap-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-9 w-9 p-0 text-blue-600 hover:bg-blue-50"
                                        onClick={() => insertOutflowProduct(index)}
                                        title="Insertar debajo"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                    {outflowData.products.length > 1 && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-9 w-9 p-0 text-red-600 hover:bg-red-50"
                                            onClick={() => removeOutflowProduct(index)}
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <Label>Comentarios</Label>
                        <Textarea
                            value={outflowData.comment}
                            onChange={(e) => setOutflowData({ ...outflowData, comment: e.target.value })}
                            placeholder="Observaciones adicionales..."
                        />
                    </div>

                    {showedTotal !== null && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center animate-in fade-in slide-in-from-top-1">
                            <span className="text-blue-700 font-bold">Total Precalculado:</span>
                            <span className="text-blue-800 text-xl font-black">
                                ${showedTotal.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={calculateCurrentTotal}
                        >
                            <Calculator className="w-4 h-4 mr-2" />
                            Precalcular Total
                        </Button>
                        <Button type="submit" disabled={createMovement.isPending}>
                            {createMovement.isPending && <Loader2 className="animate-spin mr-2" />}
                            Registrar Salida
                        </Button>
                    </div>
                </form>
            </TabsContent>

            {/* TRANSFER TAB */}
            <TabsContent value="transfer">
                <form onSubmit={handleTransferSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Fecha y Hora</Label>
                            <Input
                                type="datetime-local"
                                value={transferData.date}
                                onChange={(e) => setTransferData({ ...transferData, date: e.target.value })}
                                required
                                disabled={!!initialData}
                            />
                        </div>
                        <div>
                            <Label>Número de Remisión</Label>
                            <Input
                                value={transferData.remissionNumber}
                                onChange={(e) => setTransferData({ ...transferData, remissionNumber: e.target.value })}
                                placeholder="Ej. TRA-001"
                                required
                                disabled={!!initialData}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Desde Sucursal</Label>
                            <Select
                                value={transferData.fromBranchId}
                                onValueChange={(v) => setTransferData({ ...transferData, fromBranchId: v })}
                                disabled={!!initialData}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Origen" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches?.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Hacia Sucursal</Label>
                            <Select
                                value={transferData.toBranchId}
                                onValueChange={(v) => setTransferData({ ...transferData, toBranchId: v })}
                                disabled={!!initialData}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Destino" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches?.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-base font-semibold">Productos</Label>
                            <Button type="button" size="sm" variant="outline" onClick={addTransferProduct}>
                                <Plus className="w-4 h-4 mr-1" /> Agregar
                            </Button>
                        </div>
                        {transferData.products.map((product, index) => (
                            <div key={product.tempId} className={`grid grid-cols-12 gap-3 items-end border-b pb-4 ${product.isExisting ? 'opacity-60 bg-gray-50/50' : ''}`}>
                                <div className="col-span-8">
                                    <Label className="text-xs">Producto {product.isExisting && "(Existente)"}</Label>
                                    <Select
                                        value={product.productId}
                                        disabled={product.isExisting}
                                        onValueChange={(v) => {
                                            const selectedProduct = products?.find(p => p.id === v);
                                            const newProducts = [...transferData.products];
                                            newProducts[index].productId = v;
                                            if (selectedProduct) {
                                                newProducts[index].priceAtTransaction = String(selectedProduct.purchase_price || 0);
                                            }
                                            setTransferData({ ...transferData, products: newProducts });
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleccionar producto" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={5} className="w-[--radix-select-trigger-width]">
                                            <div className="p-2 border-b" onKeyDown={(e) => e.stopPropagation()}>
                                                <Input
                                                    placeholder="Buscar producto..."
                                                    value={productSearch}
                                                    onChange={(e) => setProductSearch(e.target.value)}
                                                    className="h-8 text-xs"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="max-h-[300px] overflow-auto">
                                                {products
                                                    ?.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                                                    ?.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                            </div>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs">Cant.</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={product.quantity}
                                        disabled={product.isExisting}
                                        onChange={(e) => {
                                            const newProducts = [...transferData.products];
                                            newProducts[index].quantity = e.target.value;
                                            setTransferData({ ...transferData, products: newProducts });
                                        }}
                                        required
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs">Costo Unit.</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={product.priceAtTransaction}
                                        disabled={product.isExisting}
                                        onChange={(e) => {
                                            const newProducts = [...transferData.products];
                                            newProducts[index].priceAtTransaction = e.target.value;
                                            setTransferData({ ...transferData, products: newProducts });
                                        }}
                                        required
                                    />
                                </div>
                                <div className="col-span-1 flex gap-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-9 w-9 p-0 text-blue-600 hover:bg-blue-50"
                                        onClick={() => insertTransferProduct(index)}
                                        title="Insertar debajo"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                    {transferData.products.length > 1 && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-9 w-9 p-0 text-red-600 hover:bg-red-50"
                                            onClick={() => removeTransferProduct(index)}
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <Label>Comentarios</Label>
                        <Textarea
                            value={transferData.comment}
                            onChange={(e) => setTransferData({ ...transferData, comment: e.target.value })}
                            placeholder="Observaciones adicionales..."
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={createMovement.isPending}>
                        {createMovement.isPending && <Loader2 className="animate-spin mr-2" />}
                        Registrar Traslado
                    </Button>
                </form>
            </TabsContent>

            {/* CONVERSION TAB */}
            <TabsContent value="conversion">
                <form onSubmit={handleConversionSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Fecha y Hora</Label>
                            <Input
                                type="datetime-local"
                                value={conversionData.date}
                                onChange={(e) => setConversionData({ ...conversionData, date: e.target.value })}
                                required
                                disabled={!!initialData}
                            />
                        </div>
                        <div>
                            <Label>Número de Remisión</Label>
                            <Input
                                value={conversionData.remissionNumber}
                                onChange={(e) => setConversionData({ ...conversionData, remissionNumber: e.target.value })}
                                placeholder="Ej. CONV-001"
                                required
                                disabled={!!initialData}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Sucursal</Label>
                        <Select
                            value={conversionData.branchId}
                            onValueChange={(v) => setConversionData({ ...conversionData, branchId: v })}
                            disabled={!!initialData}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar sucursal" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches?.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border rounded-lg p-4 bg-red-50">
                        <Label className="text-base font-semibold text-red-900">Producto Origen (Sale)</Label>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                                <Label className="text-xs">Producto</Label>
                                <Select value={conversionData.fromProductId} onValueChange={(v) => setConversionData({ ...conversionData, fromProductId: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" sideOffset={5} className="w-[--radix-select-trigger-width]">
                                        <div className="p-2 border-b" onKeyDown={(e) => e.stopPropagation()}>
                                            <Input
                                                placeholder="Buscar producto..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="h-8 text-xs"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-auto">
                                            {products
                                                ?.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                                                ?.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                        </div>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Cantidad</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={conversionData.fromQuantity}
                                    onChange={(e) => setConversionData({ ...conversionData, fromQuantity: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-green-50">
                        <Label className="text-base font-semibold text-green-900">Producto Destino (Entra)</Label>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                                <Label className="text-xs">Producto</Label>
                                <Select
                                    value={conversionData.toProductId}
                                    onValueChange={(v) => {
                                        const selectedProduct = products?.find(p => p.id === v);
                                        setConversionData({
                                            ...conversionData,
                                            toProductId: v,
                                            priceAtTransaction: selectedProduct ? String(selectedProduct.purchase_price || 0) : conversionData.priceAtTransaction
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" sideOffset={5} className="w-[--radix-select-trigger-width]">
                                        <div className="p-2 border-b" onKeyDown={(e) => e.stopPropagation()}>
                                            <Input
                                                placeholder="Buscar producto..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="h-8 text-xs"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-auto">
                                            {products
                                                ?.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                                                ?.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                        </div>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Cantidad</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={conversionData.toQuantity}
                                    onChange={(e) => setConversionData({ ...conversionData, toQuantity: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label>Costo Unitario de Transferencia/Conversión</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={conversionData.priceAtTransaction}
                            onChange={(e) => setConversionData({ ...conversionData, priceAtTransaction: e.target.value })}
                            placeholder="Ingrese el costo unitario para la capa FIFO"
                            required
                        />
                    </div>

                    <div>
                        <Label>Comentarios</Label>
                        <Textarea
                            value={conversionData.comment}
                            onChange={(e) => setConversionData({ ...conversionData, comment: e.target.value })}
                            placeholder="Ej. Conversión de bulto a kg..."
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={createMovement.isPending}>
                        {createMovement.isPending && <Loader2 className="animate-spin mr-2" />}
                        Registrar Conversión
                    </Button>
                </form>
            </TabsContent>

            {/* EXIT CONFIRMATION DIALOG */}
            <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
                <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-amber-50 p-6 border-b border-amber-100 relative">
                        <button
                            onClick={() => setShowExitConfirm(false)}
                            className="absolute top-4 right-4 text-amber-400 hover:text-amber-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="bg-amber-100 p-3 rounded-full flex-shrink-0">
                                <AlertTriangle className="w-6 h-6 text-amber-600" />
                            </div>
                            <DialogHeader>
                                <DialogTitle className="text-amber-900 text-xl font-bold">Cambios sin guardar</DialogTitle>
                                <DialogDescription className="text-amber-700 text-sm mt-1">
                                    Tienes información pendiente en el formulario. ¿Qué deseas hacer con estos cambios antes de salir?
                                </DialogDescription>
                            </DialogHeader>
                        </div>
                    </div>

                    <div className="p-6 bg-white space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                            <Button
                                variant="default"
                                className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-semibold shadow-md transition-all group"
                                onClick={() => {
                                    // Trigger the active form submit
                                    const form = document.querySelector(`form:not([hidden])`) as HTMLFormElement;
                                    if (form) form.requestSubmit();
                                    setShowExitConfirm(false);
                                }}
                            >
                                <Save className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                                Guardar y Registrar Ahora
                            </Button>

                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t mt-4">
                            <Button
                                variant="ghost"
                                className="flex-1 text-gray-500 hover:bg-gray-100 h-11 border border-transparent hover:border-gray-200"
                                onClick={() => setShowExitConfirm(false)}
                            >
                                Continuar Editando
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 h-11 font-medium shadow-sm"
                                onClick={() => {
                                    setIsDirty(false);
                                    onCancel();
                                }}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Salir sin Guardar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="flex justify-end mt-4">
                <Button
                    variant="ghost"
                    className="text-gray-500 hover:text-red-600"
                    onClick={() => {
                        if (isDirty) setShowExitConfirm(true);
                        else onCancel();
                    }}
                >
                    Cancelar / Salir
                </Button>
            </div>
        </Tabs>
    );
}

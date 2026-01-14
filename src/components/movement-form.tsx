"use client";

import { useState } from "react";
import { useCreateStockMovement, useProducts, useBranches, useProviders } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Calculator } from "lucide-react";

interface MovementFormProps {
    onSuccess: () => void;
}

export function MovementForm({ onSuccess }: MovementFormProps) {
    const { data: products } = useProducts();
    const { data: branches } = useBranches();
    const { data: providers } = useProviders();
    const createMovement = useCreateStockMovement();

    const [activeTab, setActiveTab] = useState("inflow");

    // Inflow state
    const [inflowData, setInflowData] = useState({
        date: new Date().toISOString().slice(0, 16),
        remissionNumber: "",
        branchId: "",
        providerId: "",
        dueDate: "",
        iva: "",
        retefuente: "",
        comment: "",
        products: [{ productId: "", quantity: "", priceAtTransaction: "" }]
    });

    // Outflow state
    const [outflowData, setOutflowData] = useState({
        date: new Date().toISOString().slice(0, 16),
        remissionNumber: "",
        branchId: "",
        clientType: "mostrador",
        electronicInvoiceNumber: "",
        remisionReference: "",
        comment: "",
        products: [{ productId: "", quantity: "", priceAtTransaction: "" }]
    });

    // Transfer state
    const [transferData, setTransferData] = useState({
        date: new Date().toISOString().slice(0, 16),
        remissionNumber: "",
        fromBranchId: "",
        toBranchId: "",
        comment: "",
        products: [{ productId: "", quantity: "", priceAtTransaction: "" }]
    });

    // Conversion state
    const [conversionData, setConversionData] = useState({
        date: new Date().toISOString().slice(0, 16),
        remissionNumber: "",
        branchId: "",
        fromProductId: "",
        fromQuantity: "",
        toProductId: "",
        toQuantity: "",
        priceAtTransaction: "",
        comment: ""
    });

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

        const payload = {
            type: "inflow",
            date: inflowData.date,
            remissionNumber: inflowData.remissionNumber,
            branchId: inflowData.branchId,
            branchName: branch?.name,
            providerId: inflowData.providerId,
            providerName: provider?.name,
            dueDate: inflowData.dueDate || null,
            iva: inflowData.iva ? Number(inflowData.iva) : 0,
            retefuente: inflowData.retefuente ? Number(inflowData.retefuente) : 0,
            comment: inflowData.comment,
            products: inflowData.products.map(p => {
                const product = products?.find(prod => prod.id === p.productId);
                return {
                    productId: p.productId,
                    productName: product?.name,
                    quantity: Number(p.quantity),
                    priceAtTransaction: Number(p.priceAtTransaction)
                };
            })
        };

        try {
            await createMovement.mutateAsync(payload);
            toast.success("Entrada registrada exitosamente");
            onSuccess();
        } catch (error) {
            toast.error("Error al registrar entrada");
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
            products: outflowData.products.map(p => {
                const product = products?.find(prod => prod.id === p.productId);
                return {
                    productId: p.productId,
                    productName: product?.name,
                    quantity: Number(p.quantity),
                    priceAtTransaction: Number(p.priceAtTransaction)
                };
            })
        };

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
            products: transferData.products.map(p => {
                const product = products?.find(prod => prod.id === p.productId);
                return {
                    productId: p.productId,
                    productName: product?.name,
                    quantity: Number(p.quantity),
                    priceAtTransaction: Number(p.priceAtTransaction || 0)
                };
            })
        };

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
            products: [...inflowData.products, { productId: "", quantity: "", priceAtTransaction: "" }]
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
            products: [...outflowData.products, { productId: "", quantity: "", priceAtTransaction: "" }]
        });
    };

    const removeOutflowProduct = (index: number) => {
        setOutflowData({
            ...outflowData,
            products: outflowData.products.filter((_, i) => i !== index)
        });
    };

    const addTransferProduct = () => {
        setTransferData({
            ...transferData,
            products: [...transferData.products, { productId: "", quantity: "", priceAtTransaction: "" }]
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
                <TabsTrigger value="inflow">Entrada</TabsTrigger>
                <TabsTrigger value="outflow">Salida</TabsTrigger>
                <TabsTrigger value="transfer">Traslado</TabsTrigger>
                <TabsTrigger value="conversion">Conversión</TabsTrigger>
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
                            />
                        </div>
                        <div>
                            <Label>Número de Remisión</Label>
                            <Input
                                value={inflowData.remissionNumber}
                                onChange={(e) => setInflowData({ ...inflowData, remissionNumber: e.target.value })}
                                placeholder="Ej. REM-001"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Sucursal</Label>
                            <Select value={inflowData.branchId} onValueChange={(v) => setInflowData({ ...inflowData, branchId: v })}>
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
                            <Select value={inflowData.providerId} onValueChange={(v) => setInflowData({ ...inflowData, providerId: v })}>
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
                            <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-end">
                                <div className="col-span-5">
                                    <Label className="text-xs">Producto</Label>
                                    <Select
                                        value={product.productId}
                                        onValueChange={(v) => {
                                            const newProducts = [...inflowData.products];
                                            newProducts[index].productId = v;
                                            setInflowData({ ...inflowData, products: newProducts });
                                        }}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products?.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs">Cantidad</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="h-9"
                                        value={product.quantity}
                                        onChange={(e) => {
                                            const newProducts = [...inflowData.products];
                                            newProducts[index].quantity = e.target.value;
                                            setInflowData({ ...inflowData, products: newProducts });
                                        }}
                                        required
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs">Precio Unit.</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="h-9"
                                        value={product.priceAtTransaction}
                                        onChange={(e) => {
                                            const newProducts = [...inflowData.products];
                                            newProducts[index].priceAtTransaction = e.target.value;
                                            setInflowData({ ...inflowData, products: newProducts });
                                        }}
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    {inflowData.products.length > 1 && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-9 w-9 p-0 text-red-600"
                                            onClick={() => removeInflowProduct(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label>Fecha de Vencimiento (Opcional)</Label>
                            <Input
                                type="date"
                                value={inflowData.dueDate}
                                onChange={(e) => setInflowData({ ...inflowData, dueDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>IVA (Opcional)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={inflowData.iva}
                                onChange={(e) => setInflowData({ ...inflowData, iva: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <Label>Retefuente (Opcional)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={inflowData.retefuente}
                                onChange={(e) => setInflowData({ ...inflowData, retefuente: e.target.value })}
                                placeholder="0"
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
                            />
                        </div>
                        <div>
                            <Label>Número de Remisión</Label>
                            <Input
                                value={outflowData.remissionNumber}
                                onChange={(e) => setOutflowData({ ...outflowData, remissionNumber: e.target.value })}
                                placeholder="Ej. SAL-001"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Sucursal</Label>
                        <Select value={outflowData.branchId} onValueChange={(v) => setOutflowData({ ...outflowData, branchId: v })}>
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
                        <Label>Tipo de Cliente</Label>
                        <Select value={outflowData.clientType} onValueChange={(v) => setOutflowData({ ...outflowData, clientType: v })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mostrador">Venta en Mostrador</SelectItem>
                                <SelectItem value="electronica">Factura Electrónica</SelectItem>
                                <SelectItem value="remision">Remisión</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {outflowData.clientType === "electronica" && (
                        <div>
                            <Label>Número de Factura Electrónica</Label>
                            <Input
                                value={outflowData.electronicInvoiceNumber}
                                onChange={(e) => setOutflowData({ ...outflowData, electronicInvoiceNumber: e.target.value })}
                                placeholder="Ej. FE-12345"
                            />
                        </div>
                    )}

                    {outflowData.clientType === "remision" && (
                        <div>
                            <Label>Referencia de Remisión</Label>
                            <Input
                                value={outflowData.remisionReference}
                                onChange={(e) => setOutflowData({ ...outflowData, remisionReference: e.target.value })}
                                placeholder="Ej. Cliente XYZ"
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
                            <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-end">
                                <div className="col-span-5">
                                    <Label className="text-xs">Producto</Label>
                                    <Select
                                        value={product.productId}
                                        onValueChange={(v) => {
                                            const newProducts = [...outflowData.products];
                                            newProducts[index].productId = v;

                                            // Pre-fill price from product database
                                            const selectedProduct = products?.find(p => p.id === v);
                                            if (selectedProduct) {
                                                newProducts[index].priceAtTransaction = String(selectedProduct.price || 0);
                                            }

                                            setOutflowData({ ...outflowData, products: newProducts });
                                        }}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products?.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs">Cantidad</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="h-9"
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
                                        className="h-9"
                                        value={product.priceAtTransaction}
                                        onChange={(e) => {
                                            const newProducts = [...outflowData.products];
                                            newProducts[index].priceAtTransaction = e.target.value;
                                            setOutflowData({ ...outflowData, products: newProducts });
                                        }}
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    {outflowData.products.length > 1 && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-9 w-9 p-0 text-red-600"
                                            onClick={() => removeOutflowProduct(index)}
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
                            />
                        </div>
                        <div>
                            <Label>Número de Remisión</Label>
                            <Input
                                value={transferData.remissionNumber}
                                onChange={(e) => setTransferData({ ...transferData, remissionNumber: e.target.value })}
                                placeholder="Ej. TRA-001"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Desde Sucursal</Label>
                            <Select value={transferData.fromBranchId} onValueChange={(v) => setTransferData({ ...transferData, fromBranchId: v })}>
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
                            <Select value={transferData.toBranchId} onValueChange={(v) => setTransferData({ ...transferData, toBranchId: v })}>
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
                            <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-end">
                                <div className="col-span-4">
                                    <Label className="text-xs">Producto</Label>
                                    <Select
                                        value={product.productId}
                                        onValueChange={(v) => {
                                            const newProducts = [...transferData.products];
                                            newProducts[index].productId = v;
                                            setTransferData({ ...transferData, products: newProducts });
                                        }}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products?.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs">Cantidad</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="h-9"
                                        value={product.quantity}
                                        onChange={(e) => {
                                            const newProducts = [...transferData.products];
                                            newProducts[index].quantity = e.target.value;
                                            setTransferData({ ...transferData, products: newProducts });
                                        }}
                                        required
                                    />
                                </div>
                                <div className="col-span-4">
                                    <Label className="text-xs">Costo Unit. (Preservar FIFO)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="h-9"
                                        placeholder="Costo de compra"
                                        value={product.priceAtTransaction}
                                        onChange={(e) => {
                                            const newProducts = [...transferData.products];
                                            newProducts[index].priceAtTransaction = e.target.value;
                                            setTransferData({ ...transferData, products: newProducts });
                                        }}
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    {transferData.products.length > 1 && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-9 w-9 p-0 text-red-600"
                                            onClick={() => removeTransferProduct(index)}
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
                            />
                        </div>
                        <div>
                            <Label>Número de Remisión</Label>
                            <Input
                                value={conversionData.remissionNumber}
                                onChange={(e) => setConversionData({ ...conversionData, remissionNumber: e.target.value })}
                                placeholder="Ej. CONV-001"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Sucursal</Label>
                        <Select value={conversionData.branchId} onValueChange={(v) => setConversionData({ ...conversionData, branchId: v })}>
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
                                    <SelectContent>
                                        {products?.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
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
                                <Select value={conversionData.toProductId} onValueChange={(v) => setConversionData({ ...conversionData, toProductId: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products?.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
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
        </Tabs>
    );
}

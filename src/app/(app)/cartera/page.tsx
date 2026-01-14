"use client";

import { useState } from "react";
import { useInvoices, useRegisterPayment, useDeleteInvoice } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Loader2, ChevronDown, ChevronUp, Trash2, Receipt, DollarSign, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

export default function PortfolioPage() {
    const { data: invoices, isLoading } = useInvoices();
    const registerPayment = useRegisterPayment();
    const deleteInvoice = useDeleteInvoice();

    const [searchTerm, setSearchTerm] = useState("");
    const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedInvoices);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedInvoices(newExpanded);
    };

    const handleRegisterPayment = async () => {
        if (!selectedInvoice || !paymentAmount || !paymentDate) {
            toast.error("Por favor completa todos los campos");
            return;
        }

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("El monto debe ser un número positivo");
            return;
        }

        try {
            await registerPayment.mutateAsync({
                invoice_id: selectedInvoice.id,
                amount,
                date: paymentDate
            });
            toast.success("Pago registrado exitosamente");
            setPaymentDialogOpen(false);
            setPaymentAmount("");
            setSelectedInvoice(null);
        } catch (error: any) {
            toast.error(error.message || "Error al registrar el pago");
        }
    };

    const handleDeleteInvoice = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar esta factura? Esta acción eliminará también el historial de pagos.")) return;
        try {
            await deleteInvoice.mutateAsync(id);
            toast.success("Factura eliminada correctamente");
        } catch (error: any) {
            toast.error("Error al eliminar la factura");
        }
    };

    const filteredInvoices = invoices?.filter(inv =>
        inv.remission_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.provider_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Cartera (Cuentas por Pagar)</h1>
                    <p className="text-muted-foreground">Gestiona las deudas con proveedores y el historial de pagos.</p>
                </div>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                    placeholder="Buscar por remisión o proveedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Remisión</TableHead>
                            <TableHead>Fecha Factura</TableHead>
                            <TableHead>Vencimiento</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead className="text-right">IVA</TableHead>
                            <TableHead className="text-right">Rete</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Pagado</TableHead>
                            <TableHead className="text-right">Pendiente</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead className="text-right w-32">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={12} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                                    No se encontraron facturas en cartera.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((inv) => (
                                <>
                                    <TableRow key={inv.id} className={expandedInvoices.has(inv.id) ? "bg-gray-50/50" : ""}>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => toggleExpand(inv.id)} className="h-8 w-8">
                                                {expandedInvoices.has(inv.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="font-medium">{inv.remission_number}</TableCell>
                                        <TableCell>{format(new Date(inv.date), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>
                                            <span className={new Date(inv.due_date) < new Date() && inv.pending_balance > 0 ? "text-red-600 font-semibold" : ""}>
                                                {inv.due_date ? format(new Date(inv.due_date), 'dd/MM/yyyy') : '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-[150px] truncate" title={inv.provider_name}>{inv.provider_name || '-'}</TableCell>
                                        <TableCell className="text-right text-xs text-gray-500">{formatCurrency(inv.iva || 0)}</TableCell>
                                        <TableCell className="text-right text-xs text-gray-500">{formatCurrency(inv.retefuente || 0)}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(inv.total_amount)}</TableCell>
                                        <TableCell className="text-right text-green-600">{formatCurrency(inv.paid_amount)}</TableCell>
                                        <TableCell className="text-right font-semibold text-orange-600">
                                            {formatCurrency(inv.pending_balance)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={inv.pending_balance <= 0 ? "default" : "destructive"}
                                                className={inv.pending_balance <= 0 ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200" : ""}>
                                                {inv.pending_balance <= 0 ? 'Pagado' : 'Pendiente'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedInvoice(inv);
                                                        setPaymentAmount(inv.pending_balance.toString());
                                                        setPaymentDialogOpen(true);
                                                    }}
                                                    disabled={inv.pending_balance <= 0}
                                                    className="h-8 text-xs font-bold border-green-600 text-green-700 hover:bg-green-50"
                                                >
                                                    <DollarSign className="h-3 w-3 mr-1" /> Pago
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600"
                                                    onClick={() => handleDeleteInvoice(inv.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {expandedInvoices.has(inv.id) && (
                                        <TableRow className="bg-gray-50/50">
                                            <TableCell colSpan={12} className="p-4">
                                                <div className="bg-white border rounded-lg p-4 shadow-sm ml-10">
                                                    <h4 className="text-sm font-bold flex items-center mb-3">
                                                        <Receipt className="h-4 w-4 mr-2 text-primary" />
                                                        Historial de Pagos - Remisión {inv.remission_number}
                                                    </h4>
                                                    {inv.payment_history && inv.payment_history.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {inv.payment_history.map((pay: any, idx: number) => (
                                                                <div key={idx} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded border-b last:border-0 border-dashed">
                                                                    <div className="flex items-center gap-4">
                                                                        <span className="text-gray-500 w-24">
                                                                            {format(new Date(pay.date), 'dd MMM yyyy', { locale: es })}
                                                                        </span>
                                                                        <Badge variant="outline" className="text-xs">Pago #{inv.payment_history.length - idx}</Badge>
                                                                    </div>
                                                                    <span className="font-bold text-green-700">{formatCurrency(pay.amount)}</span>
                                                                </div>
                                                            ))}
                                                            <div className="flex justify-between items-center pt-2 mt-2 border-t font-bold">
                                                                <span>Total Pagado</span>
                                                                <span className="text-green-700">{formatCurrency(inv.paid_amount)}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-500 italic">No hay pagos registrados para esta factura.</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Payment Dialog */}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            Registrar Pago
                        </DialogTitle>
                    </DialogHeader>
                    {selectedInvoice && (
                        <div className="grid gap-4 py-4">
                            <div className="bg-gray-50 p-3 rounded-md border text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Remisión:</span>
                                    <span className="font-medium">{selectedInvoice.remission_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Proveedor:</span>
                                    <span className="font-medium">{selectedInvoice.provider_name}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Total Factura:</span>
                                    <span className="font-medium">{formatCurrency(selectedInvoice.total_amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Saldo Pendiente:</span>
                                    <span className="font-bold text-orange-600">{formatCurrency(selectedInvoice.pending_balance)}</span>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="amount">Monto del Pago</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        id="amount"
                                        type="number"
                                        className="pl-9"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400">Puedes ingresar pagos parciales o el total.</p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="date">Fecha de Pago</Label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        id="date"
                                        type="date"
                                        className="pl-9"
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 font-bold"
                            onClick={handleRegisterPayment}
                            disabled={registerPayment.isPending}
                        >
                            {registerPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Pago
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

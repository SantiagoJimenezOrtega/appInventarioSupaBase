"use client";

import { useState } from "react";
import { useProviders, useCreateProvider, useUpdateProvider, useDeleteProvider } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Loader2, Phone, User, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const providerSchema = z.object({
    name: z.string().min(2, "El nombre es requerido"),
    contact_person: z.string().optional(),
    contact_number: z.string().optional(),
});

import { ExcelImportDialog } from "@/components/excel-import-dialog";
import { ExcelExportButton } from "@/components/excel-export-button";

export default function ProvidersPage() {
    const { data: providers, isLoading } = useProviders();
    const createProvider = useCreateProvider();
    const updateProvider = useUpdateProvider();
    const deleteProvider = useDeleteProvider();
    const [isOpen, setIsOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const form = useForm<z.infer<typeof providerSchema>>({
        resolver: zodResolver(providerSchema),
        defaultValues: {
            name: "",
            contact_person: "",
            contact_number: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof providerSchema>) => {
        try {
            if (editingProvider) {
                await updateProvider.mutateAsync({ id: editingProvider.id, data: values });
                toast.success("Proveedor actualizado exitosamente");
            } else {
                await createProvider.mutateAsync(values);
                toast.success("Proveedor registrado exitosamente");
            }
            setIsOpen(false);
            setEditingProvider(null);
            form.reset();
        } catch (error) {
            toast.error("Error al procesar proveedor");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este proveedor?")) return;
        try {
            await deleteProvider.mutateAsync(id);
            toast.success("Proveedor eliminado correctamente");
        } catch (error) {
            toast.error("Error al eliminar el proveedor");
        }
    };

    const openEdit = (provider: any) => {
        setEditingProvider(provider);
        form.reset({
            name: provider.name,
            contact_person: provider.contact_person || "",
            contact_number: provider.contact_number || "",
        });
        setIsOpen(true);
    };

    const openCreate = () => {
        setEditingProvider(null);
        form.reset({
            name: "",
            contact_person: "",
            contact_number: "",
        });
        setIsOpen(true);
    };

    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    const filteredProviders = providers?.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const totalPages = Math.ceil(filteredProviders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProviders = filteredProviders.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
                    <p className="text-muted-foreground">Gestiona la base de datos de proveedores.</p>
                </div>

                <div className="flex gap-2">
                    <ExcelExportButton type="providers" data={providers || []} />
                    <ExcelImportDialog type="providers" />
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-bold" onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingProvider ? "Editar Proveedor" : "Registrar Nuevo Proveedor"}</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Razón Social / Nombre</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ej. AgroInsumos SAS" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="contact_person"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Contacto (Opcional)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Nombre contacto" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="contact_number"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Teléfono</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="+57 300..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={createProvider.isPending || updateProvider.isPending}>
                                        {(createProvider.isPending || updateProvider.isPending) && <Loader2 className="animate-spin mr-2" />}
                                        {editingProvider ? "Actualizar Proveedor" : "Guardar Proveedor"}
                                    </Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                    placeholder="Buscar proveedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Persona de Contacto</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead className="text-center w-24">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : filteredProviders?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                    No hay proveedores registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedProviders?.map((provider) => (
                                <TableRow key={provider.id}>
                                    <TableCell className="font-medium">{provider.name}</TableCell>
                                    <TableCell>
                                        {provider.contact_person ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <User className="h-3 w-3" /> {provider.contact_person}
                                            </div>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {provider.contact_number ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone className="h-3 w-3" /> {provider.contact_number}
                                            </div>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openEdit(provider)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(provider.id)}>
                                                <Trash2 className="h-4 w-4" />
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
            {filteredProviders && filteredProviders.length > 0 && (
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
        </div >
    );
}

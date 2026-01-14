"use client";

import { useState } from "react";
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Loader2, MapPin, User, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { ExcelExportButton } from "@/components/excel-export-button";
import { ExcelImportDialog } from "@/components/excel-import-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const branchSchema = z.object({
    name: z.string().min(2, "El nombre es requerido"),
    location: z.string().min(2, "La ubicación es requerida"),
    encargado: z.string().optional(),
});

export default function BranchesPage() {
    const { data: branches, isLoading } = useBranches();
    const createBranch = useCreateBranch();
    const updateBranch = useUpdateBranch();
    const deleteBranch = useDeleteBranch();
    const [isOpen, setIsOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const form = useForm<z.infer<typeof branchSchema>>({
        resolver: zodResolver(branchSchema),
        defaultValues: {
            name: "",
            location: "",
            encargado: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof branchSchema>) => {
        try {
            if (editingBranch) {
                await updateBranch.mutateAsync({ id: editingBranch.id, data: values });
                toast.success("Sucursal actualizada exitosamente");
            } else {
                await createBranch.mutateAsync(values);
                toast.success("Sucursal creada exitosamente");
            }
            setIsOpen(false);
            setEditingBranch(null);
            form.reset();
        } catch (error) {
            toast.error("Error al procesar sucursal");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar esta sucursal?")) return;
        try {
            await deleteBranch.mutateAsync(id);
            toast.success("Sucursal eliminada correctamente");
        } catch (error) {
            toast.error("Error al eliminar la sucursal");
        }
    };

    const openEdit = (branch: any) => {
        setEditingBranch(branch);
        form.reset({
            name: branch.name,
            location: branch.location,
            encargado: branch.encargado || "",
        });
        setIsOpen(true);
    };

    const openCreate = () => {
        setEditingBranch(null);
        form.reset({
            name: "",
            location: "",
            encargado: "",
        });
        setIsOpen(true);
    };

    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    const filteredBranches = branches?.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const totalPages = Math.ceil(filteredBranches.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBranches = filteredBranches.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sucursales</h1>
                    <p className="text-muted-foreground">Administra las ubicaciones de tu negocio.</p>
                </div>
                <div className="flex gap-2">
                    <ExcelExportButton type="branches" data={branches || []} />
                    <ExcelImportDialog type="branches" />
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-bold" onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" /> Nueva Sucursal
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingBranch ? "Editar Sucursal" : "Crear Nueva Sucursal"}</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nombre de Sucursal</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ej. Sede Principal" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Ubicación / Dirección</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ej. Km 5 Vía..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="encargado"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Encargado (Opcional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nombre del responsable" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={createBranch.isPending || updateBranch.isPending}>
                                        {(createBranch.isPending || updateBranch.isPending) && <Loader2 className="animate-spin mr-2" />}
                                        {editingBranch ? "Actualizar Sucursal" : "Guardar Sucursal"}
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
                    placeholder="Buscar branch..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <div className="col-span-full h-24 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : filteredBranches?.length === 0 ? (
                    <div className="col-span-full text-center text-muted-foreground py-10">
                        No hay sucursales registradas.
                    </div>
                ) : (
                    paginatedBranches?.map((branch) => (
                        <div key={branch.id} className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-lg">{branch.name}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {branch.location}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="bg-primary/10 text-primary p-2 rounded-lg">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openEdit(branch)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(branch.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            {branch.encargado && (
                                <div className="mt-4 pt-4 border-t flex items-center text-sm text-gray-600">
                                    <User className="w-4 h-4 mr-2" />
                                    Encargado: {branch.encargado}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {filteredBranches && filteredBranches.length > 0 && (
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

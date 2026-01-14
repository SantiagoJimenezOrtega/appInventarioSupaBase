"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useCreateProduct, useCreateBranch, useCreateProvider } from "@/hooks/use-api";

interface ExcelImportProps {
    type: 'products' | 'branches' | 'providers';
}

export function ExcelImportDialog({ type }: ExcelImportProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [error, setError] = useState("");

    const createProduct = useCreateProduct();
    const createBranch = useCreateBranch();
    const createProvider = useCreateProvider();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            readExcel(selectedFile);
        }
    };

    const readExcel = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const parsedData = XLSX.utils.sheet_to_json(sheet);
                setPreview(parsedData);
                setError("");
            } catch (err) {
                setError("Error al leer el archivo. Asegúrate de que sea un Excel válido.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        if (!preview.length) return;

        setIsLoading(true);
        let successCount = 0;
        let failCount = 0;

        // Process chunked to avoid UI freeze if large, though for this scale simple loop is fine
        for (const row of preview) {
            try {
                if (type === 'products') {
                    // Expected Map: Name -> name, etc. Adjust based on user files usually, assuming simple headers for now
                    // We try to map vaguely to match generic headers
                    const parseNumber = (val: any) => {
                        if (val === null || val === undefined || val === '') return 0;
                        if (typeof val === 'number') return val;

                        let str = String(val).trim();
                        // Remover símbolo de moneda y espacios
                        str = str.replace(/[$\sA-Za-z]/g, '');

                        // Si tiene formato con puntos como miles y coma como decimal (16.000,00)
                        if (str.includes('.') && str.includes(',')) {
                            str = str.replace(/\./g, ''); // Eliminar puntos
                            str = str.replace(',', '.'); // Cambiar coma por punto
                        } else if (str.includes(',')) {
                            // Si solo tiene coma (16,00), asumir decimal
                            str = str.replace(',', '.');
                        }
                        // Si solo tiene puntos (16.000), puede ser ambiguo pero en COL suele ser miles.
                        // Sin embargo, parseFloat('16.000') da 16. Si no hay coma, asumimos que es un entero sin decimales pero con separador de miles QUE JS NO ENTIENDE
                        // OJO: parseFloat('16000') sirve. parseFloat('16.000') sirve. 
                        // El problema es que si es dinero COL, '16.000' es 16000. Pero JS lee 16.
                        else if (str.includes('.') && !str.includes(',')) {
                            // Caso dificil: 16.000 -> queremos 16000. pero 16.5 -> queremos 16.5
                            // Asumimos formato COL: si tiene punto, y parece separador de miles (3 digitos despues), lo quitamos
                            if (str.match(/\.\d{3}$/) || str.match(/\.\d{3}\./)) {
                                str = str.replace(/\./g, '');
                            }
                        }

                        const num = parseFloat(str);
                        return isNaN(num) ? 0 : num;
                    };

                    const payload = {
                        name: row['Nombre'] || row['Name'] || row['nombre'] || row['name'],
                        description: row['Descripción'] || row['Description'] || row['descripcion'] || row['description'] || '',
                        price: parseNumber(row['Precio'] || row['Price'] || row['precio'] || row['price']),
                        purchase_price: parseNumber(row['Costo'] || row['Cost'] || row['costo'] || row['cost'])
                    };
                    if (!payload.name) throw new Error("Missing name");
                    await createProduct.mutateAsync(payload);
                }
                else if (type === 'branches') {
                    const payload = {
                        name: row['Nombre'] || row['Name'] || row['nombre'] || row['name'],
                        location: row['Ubicación'] || row['Location'] || row['ubicacion'] || row['location'],
                        encargado: row['Encargado'] || row['Manager'] || row['encargado'] || row['manager']
                    };
                    if (!payload.name) throw new Error("Missing name");
                    await createBranch.mutateAsync(payload);
                }
                else if (type === 'providers') {
                    const payload = {
                        name: row['Nombre'] || row['Name'] || row['nombre'] || row['name'] || row['Nombre del Proveedor'],
                        contact_person: row['Contacto'] || row['Contact'] || row['contacto'] || row['contact'] || row['Encargado / Contacto'] || '',
                        contact_number: row['Teléfono'] || row['Phone'] || row['telefono'] || row['phone'] || row['Número de Contacto'] || ''
                    };
                    if (!payload.name) {
                        // Skip empty rows silently
                        const isEmptyRow = Object.values(row).every(x => x === null || x === undefined || x === '');
                        if (isEmptyRow) continue;

                        console.warn("Row missing name:", row);
                        throw new Error(`Fila sin nombre: ${JSON.stringify(row)}`);
                    }
                    await createProvider.mutateAsync(payload);
                }
                successCount++;
            } catch (e: any) {
                failCount++;
                console.error("Error importando fila:", e.message);
            }
        }

        setIsLoading(false);
        toast.success(`Importación finalizada: ${successCount} exitosos, ${failCount} fallidos.`);
        setIsOpen(false);
        setFile(null);
        setPreview([]);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    Importar Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Importar {type === 'products' ? 'Productos' : type === 'branches' ? 'Sucursales' : 'Proveedores'}</DialogTitle>
                    <DialogDescription>
                        Carga un archivo .xlsx. La primera fila debe contener los encabezados (Nombre, Precio, etc).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-center w-full">
                        <Label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-4 text-gray-500" />
                                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click para subir</span> o arrastra</p>
                                <p className="text-xs text-gray-500">XLSX, XLS (MAX. 5MB)</p>
                            </div>
                            <Input id="dropzone-file" type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                        </Label>
                    </div>

                    {file && (
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                            <CheckCircle className="w-4 h-4" />
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <span className="ml-auto text-xs text-gray-500">{preview.length} filas detectadas</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {preview.length > 0 && (
                        <div className="max-h-32 overflow-y-auto text-xs border rounded">
                            <table className="w-full text-left">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        {Object.keys(preview[0]).map(key => (
                                            <th key={key} className="p-1">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.slice(0, 5).map((row, i) => (
                                        <tr key={i} className="border-t">
                                            {Object.values(row).map((val: any, j) => (
                                                <td key={j} className="p-1 truncate max-w-[100px]">{val}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {preview.length > 5 && <div className="p-1 text-center bg-gray-50 text-gray-400">... y {preview.length - 5} más</div>}
                        </div>
                    )}
                </div>

                <Button onClick={handleImport} className="w-full" disabled={!file || isLoading || preview.length === 0}>
                    {isLoading && <Loader2 className="animate-spin mr-2" />}
                    Procesar Importación
                </Button>
            </DialogContent>
        </Dialog>
    );
}

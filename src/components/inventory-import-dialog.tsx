"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useCreateStockMovement, useProducts, useBranches } from "@/hooks/use-api";

export function InventoryImportDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [error, setError] = useState("");

    const createMovement = useCreateStockMovement();
    const { data: products } = useProducts();
    const { data: branches } = useBranches();

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

    const parseNumber = (val: any) => {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return val;

        let str = String(val).trim();
        str = str.replace(/[$\sA-Za-z]/g, '');

        if (str.includes('.') && str.includes(',')) {
            str = str.replace(/\./g, '');
            str = str.replace(',', '.');
        } else if (str.includes(',')) {
            str = str.replace(',', '.');
        } else if (str.includes('.') && !str.includes(',')) {
            if (str.match(/\.\d{3}$/) || str.match(/\.\d{3}\./)) {
                str = str.replace(/\./g, '');
            }
        }

        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    };

    // Parse FIFO layers from text like: "1 @ $16.000,00 (Comprado: 16/06/2025); 11 @ $16.000,00 (Comprado: 12/12/2025)"
    const parseFIFOLayers = (layersText: string) => {
        if (!layersText || layersText === 'N/A' || layersText.trim() === '') return [];

        const layers: Array<{ quantity: number; cost: number; date: string }> = [];

        // Split by semicolon to get individual layers
        const layerParts = layersText.split(';').map(s => s.trim()).filter(s => s);

        for (const part of layerParts) {
            try {
                // Extract quantity: "1 @ $16.000,00 (Comprado: 16/06/2025)"
                const qtyMatch = part.match(/^(\d+(?:[.,]\d+)?)\s*@/);
                if (!qtyMatch) continue;

                const quantity = parseNumber(qtyMatch[1]);

                // Extract cost: between @ and (
                const costMatch = part.match(/@\s*([^(]+)\(/);
                if (!costMatch) continue;

                const cost = parseNumber(costMatch[1]);

                // Extract date: inside parentheses
                const dateMatch = part.match(/\(Comprado:\s*([^)]+)\)/);
                const dateStr = dateMatch ? dateMatch[1].trim() : new Date().toISOString();

                // Convert DD/MM/YYYY to ISO format
                let isoDate = new Date().toISOString();
                if (dateMatch) {
                    const dateParts = dateStr.split('/');
                    if (dateParts.length === 3) {
                        const [day, month, year] = dateParts;
                        isoDate = new Date(`${year}-${month}-${day}`).toISOString();
                    }
                }

                layers.push({ quantity, cost, date: isoDate });
            } catch (e) {
                console.warn("Error parsing layer:", part, e);
            }
        }

        return layers;
    };

    const handleImport = async () => {
        if (!preview.length) return;

        setIsLoading(true);
        let successCount = 0;
        let failCount = 0;
        const skippedRows: any[] = [];
        const errors: string[] = [];

        // Batch name for this import session
        const batchDate = new Date().toISOString().split('T')[0];
        const batchId = `IMPORT-${batchDate}-${Math.floor(Math.random() * 1000)}`;

        // Normalización ultra-agresiva: Solo letras y números en minúscula
        const normalizeUltra = (name: string) => {
            if (!name) return "";
            return name.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // Quitar tildes
                .replace(/[^a-z0-9]/g, ''); // Solo mantiene letras y números (incluyendo la 'x')
        };

        // Group rows by Branch to send fewer requests
        const branchGroups = new Map<string, any[]>();

        console.log("=== INICIANDO MATCHING DE PRODUCTOS ===");
        console.log("Ejemplo de normalización:", "ABONEX x 4 L =>", normalizeUltra("ABONEX x 4 L"));

        for (const row of preview) {
            // Flexible header detection (looking for any variant of "Cantidad")
            const productName = String(row['Producto'] || row['producto'] || row['PRODUCTO'] || row['Name'] || row['PRODUCTOS'] || "").trim();
            const branchName = String(row['Sucursal'] || row['sucursal'] || row['SUCURSAL'] || row['Branch'] || row['SEDE'] || "").trim();

            // Try different possible quantity headers
            const rawQty = row['Cantidad en Sucursal'] || row['Cantidad'] || row['cantidad'] || row['CANTIDAD'] || row['Stock'] || row['STOCK'] || 0;
            const quantity = parseNumber(rawQty);

            // REGLA GLOBAL: Si la cantidad es 0, se ignora SIEMPRE (para Tunja, Versalles y todas)
            if (!productName || !branchName || quantity === 0) {
                if (quantity === 0 && productName) {
                    console.log(`🚫 FILTRO 0: Ignorando ${productName} en ${branchName} (Cantidad es exactamente 0)`);
                }
                skippedRows.push({
                    Excel_Producto: productName,
                    Excel_Sucursal: branchName,
                    Razon: quantity === 0 ? "Cantidad es 0" : "Falta nombre",
                });
                continue;
            }

            const matchName = normalizeUltra(productName);
            const matchBranch = normalizeUltra(branchName);

            const product = products?.find(p => normalizeUltra(p.name) === matchName);
            const branch = branches?.find(b => normalizeUltra(b.name) === matchBranch);

            if (!product || !branch) {
                const reason = !product ? "PRODUCTO NO ENCONTRADO" : "SUCURSAL NO ENCONTRADA";
                console.warn(`❌ ERROR: ${reason} | Excel: "${productName}" [${matchName}] | Sede: "${branchName}" [${matchBranch}]`);

                skippedRows.push({
                    Excel_Producto: productName,
                    Excel_Sucursal: branchName,
                    Razon: reason,
                    Match_Intentado: matchName,
                    Falla_Sede: !branch
                });
                continue;
            }

            const key = branch.id;
            if (!branchGroups.has(key)) branchGroups.set(key, []);

            branchGroups.get(key)!.push({
                product,
                branch,
                quantity,
                layersText: row['Capas de Costo (Detalle)'] || row['Capas de Costo'] || row['Capas'] || '',
                rawRow: row
            });
        }

        // Process each branch group
        for (const [branchId, rows] of branchGroups.entries()) {
            const branch = rows[0].branch;
            console.log(`Procesando ${rows.length} productos para sucursal: ${branch.name}`);

            try {
                // Build a single movement with multiple products
                const movementProducts: any[] = [];

                for (const rowData of rows) {
                    const layers = parseFIFOLayers(rowData.layersText);

                    if (layers.length === 0) {
                        const totalValue = parseNumber(rowData.rawRow['Valor en Sucursal (Costo)'] || 0);
                        movementProducts.push({
                            productId: rowData.product.id,
                            productName: rowData.product.name,
                            quantity: rowData.quantity,
                            priceAtTransaction: rowData.quantity > 0 ? totalValue / rowData.quantity : 0
                        });
                    } else {
                        // If it has layers, we can't easily group it in one product entry if dates are different
                        // but we can send them as separate product entries in the same movement payload
                        layers.forEach(layer => {
                            movementProducts.push({
                                productId: rowData.product.id,
                                productName: rowData.product.name,
                                quantity: layer.quantity,
                                priceAtTransaction: layer.cost
                            });
                        });
                    }
                }

                if (movementProducts.length > 0) {
                    const payload = {
                        type: "inflow",
                        date: new Date().toISOString(),
                        remissionNumber: batchId,
                        branchId: branch.id,
                        branchName: branch.name,
                        providerId: null,
                        providerName: "Inventario Inicial",
                        comment: `Importación masiva Excel - ${batchDate}`,
                        products: movementProducts
                    };

                    await createMovement.mutateAsync(payload);
                    successCount += rows.length;
                }
            } catch (e: any) {
                console.error(`Error en grupo sucursal ${branch.name}:`, e);
                errors.push(`Error sucursal ${branch.name}: ${e.message}`);
                failCount += rows.length;
            }
        }

        setIsLoading(false);

        if (skippedRows.length > 0) {
            console.log("=== RESUMEN DE FILAS OMITIDAS ===");
            console.table(skippedRows);
            toast.warning(`${skippedRows.length} filas fueron omitidas por datos inválidos. Revisa la consola.`);
        }

        if (failCount > 0) {
            toast.error(`Error en importación: ${failCount} productos no pudieron guardarse.`);
        } else {
            toast.success(`Éxito: ${successCount} productos cargados en bloque ${batchId}`);
        }

        setIsOpen(false);
        setFile(null);
        setPreview([]);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload className="w-4 h-4 text-green-600" />
                    Importar Inventario Inicial
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Importar Inventario Inicial</DialogTitle>
                    <DialogDescription>
                        Carga tu archivo Excel con el inventario actual. El sistema detectará automáticamente las capas FIFO.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                        <strong className="text-blue-900">Formato aceptado:</strong>
                        <ul className="list-disc list-inside text-blue-800 mt-1 space-y-1">
                            <li><strong>Producto</strong>: Nombre del producto</li>
                            <li><strong>Sucursal</strong>: Nombre de la sucursal</li>
                            <li><strong>Cantidad en Sucursal</strong>: Cantidad total</li>
                            <li><strong>Capas de Costo (Detalle)</strong>: Ej: "1 @ $16.000 (Comprado: 16/06/2025); 11 @ $16.000 (Comprado: 12/12/2025)"</li>
                        </ul>
                    </div>

                    <div className="flex items-center justify-center w-full">
                        <Label htmlFor="inventory-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-4 text-gray-500" />
                                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click para subir</span> o arrastra</p>
                                <p className="text-xs text-gray-500">XLSX, XLS (MAX. 10MB)</p>
                            </div>
                            <Input id="inventory-file" type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
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
                        <div className="max-h-48 overflow-y-auto text-xs border rounded">
                            <table className="w-full text-left">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        {Object.keys(preview[0]).slice(0, 4).map(key => (
                                            <th key={key} className="p-1 text-xs">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.slice(0, 5).map((row, i) => (
                                        <tr key={i} className="border-t">
                                            {Object.values(row).slice(0, 4).map((val: any, j) => (
                                                <td key={j} className="p-1 truncate max-w-[120px]">{String(val)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {preview.length > 5 && <div className="p-1 text-center bg-gray-50 text-gray-400">... y {preview.length - 5} más</div>}
                        </div>
                    )}

                    <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
                        <strong>Importante:</strong> Los productos y sucursales deben existir previamente en el sistema.
                        El sistema buscará coincidencias exactas por nombre (no sensible a mayúsculas).
                    </div>
                </div>

                <Button onClick={handleImport} className="w-full" disabled={!file || isLoading || preview.length === 0}>
                    {isLoading && <Loader2 className="animate-spin mr-2" />}
                    {isLoading ? `Procesando... (esto puede tomar unos minutos)` : `Procesar Importación (${preview.length} filas)`}
                </Button>
            </DialogContent>
        </Dialog>
    );
}

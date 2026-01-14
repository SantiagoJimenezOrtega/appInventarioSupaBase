"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useCreateStockMovement, useProducts, useBranches, useUpdateProduct } from "@/hooks/use-api";

export function InventoryImportDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [error, setError] = useState("");

    const createMovement = useCreateStockMovement();
    const updateProduct = useUpdateProduct();
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
        // Remove currency symbols but keep separators
        str = str.replace(/[$\sA-Za-z]/g, '');

        if (str.includes('.') && str.includes(',')) {
            // Case 1.234,56 (Colombian/German style)
            str = str.replace(/\./g, '');
            str = str.replace(',', '.');
        } else if (str.includes(',')) {
            // Case 1234,56 -> 1234.56
            // Check if it's like 1.234 (thousand separator) but it's a comma
            if (str.match(/,\d{3}$/) && !str.includes('.')) {
                // Suspicious for being a thousand separator 1,000
                // But usually, comma is decimal in Colombia. 
                // Let's assume comma is decimal unless it matches exactly X,000
                str = str.replace(',', '.');
            } else {
                str = str.replace(',', '.');
            }
        } else if (str.includes('.') && !str.includes(',')) {
            // Case 1.234 (Could be 1.234 or one thousand two hundred thirty four)
            // If it matches exactly 3 digits after dot, assume it is thousand separator in CO
            if (str.match(/\.\d{3}$/)) {
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
                const qtyMatch = part.match(/^(-?\d+(?:[.,]\d+)?)\s*@/);
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
                .replace(/[^a-z0-9]/g, ''); // Solo mantiene letras y números
        };

        // 1. Pass: Collect unique product updates and group rows by branch
        const productUpdates = new Map<string, number>();
        const branchGroups = new Map<string, any[]>();

        console.log("=== INICIANDO FASE 1: PROCESAMIENTO DE EXCEL ===");

        for (const row of preview) {
            const productName = String(row['Producto'] || row['producto'] || row['PRODUCTO'] || row['Name'] || row['PRODUCTOS'] || "").trim();
            const branchName = String(row['Sucursal'] || row['sucursal'] || row['SUCURSAL'] || row['Branch'] || row['SEDE'] || "").trim();
            const rawQty = row['Cantidad en Sucursal'] || row['Cantidad'] || row['cantidad'] || row['CANTIDAD'] || row['Stock'] || row['STOCK'] || 0;
            const quantity = parseNumber(rawQty);

            if (!productName || !branchName || quantity === 0) {
                skippedRows.push({ Excel_Producto: productName, Excel_Sucursal: branchName, Razon: quantity === 0 ? "Cantidad 0" : "Falta nombre/sede" });
                continue;
            }

            const matchName = normalizeUltra(productName);
            const matchBranch = normalizeUltra(branchName);

            const product = products?.find(p => normalizeUltra(p.name) === matchName);
            const branch = branches?.find(b => normalizeUltra(b.name) === matchBranch);

            if (!product || !branch) {
                skippedRows.push({ Excel_Producto: productName, Excel_Sucursal: branchName, Razon: !product ? "Producto no encontrado" : "Sucursal no encontrada" });
                continue;
            }

            const rawCostPrice =
                row['Precio Unit. Compra'] || row['PRECIO UNIT. COMPRA'] || row['precio unit. compra'] ||
                row['Precio Unit. Venta'] || row['precio unit. venta'] || row['PRECIO UNIT. VENTA'] ||
                row['Costo Unitario'] || row['COSTO UNITARIO'] || row['Costo'] || null;
            const costPrice = rawCostPrice !== null ? parseNumber(rawCostPrice) : null;

            if (costPrice !== null && costPrice > 0) {
                productUpdates.set(product.id, costPrice);
            }

            const key = branch.id;
            if (!branchGroups.has(key)) branchGroups.set(key, []);
            branchGroups.get(key)!.push({
                product,
                branch,
                quantity,
                costFromColumn: costPrice,
                layersText: row['Capas de Costo (Detalle)'] || row['Capas de Costo'] || row['Capas'] || '',
                rawRow: row
            });
        }

        // 2. Pass: Execute product updates in parallel
        if (productUpdates.size > 0) {
            console.log(`=== FASE 2: ACTUALIZANDO ${productUpdates.size} PRECIOS EN PARALELO ===`);
            const updatePromises = Array.from(productUpdates.entries()).map(([id, price]) =>
                updateProduct.mutateAsync({ id, data: { purchase_price: price } })
            );
            await Promise.all(updatePromises);
        }

        // 3. Pass: Execute branch movements
        console.log(`=== FASE 3: CREANDO MOVIMIENTOS POR SUCURSAL (${branchGroups.size} sedes) ===`);
        for (const [branchId, rows] of branchGroups.entries()) {
            const branch = rows[0].branch;
            try {
                const movementProducts: any[] = [];
                for (const rowData of rows) {
                    const layers = parseFIFOLayers(rowData.layersText);
                    const layersSum = layers.reduce((sum, l) => sum + l.quantity, 0);

                    // If layers exist but don't match total quantity, we prioritize column 'Cantidad'
                    // but we will distribute it across existing layers if possible
                    if (layers.length > 0) {
                        if (Math.abs(layersSum - rowData.quantity) > 0.01) {
                            console.warn(`Discrepancia en ${rowData.product.name}: Cantidad Excel ${rowData.quantity} vs Suma Capas ${layersSum}. Usando cantidad de columna.`);
                        }

                        // If layersSum is 0 for some reason but text existed
                        if (layersSum === 0) {
                            movementProducts.push({
                                productId: rowData.product.id,
                                productName: rowData.product.name,
                                quantity: rowData.quantity,
                                priceAtTransaction: rowData.costFromColumn || 0
                            });
                        } else {
                            // Adjust layers to match rowData.quantity proportionally or just add the difference to the last one
                            const ratio = rowData.quantity / layersSum;
                            layers.forEach(layer => {
                                movementProducts.push({
                                    productId: rowData.product.id,
                                    productName: rowData.product.name,
                                    quantity: layer.quantity * ratio,
                                    priceAtTransaction: layer.cost
                                });
                            });
                        }
                    } else {
                        // No layers, use direct quantity and cost
                        const totalValue = parseNumber(rowData.rawRow['Valor en Sucursal (Costo)'] || rowData.rawRow['Valor en Sucursal'] || 0);
                        let unitPrice = 0;
                        if (totalValue > 0 && rowData.quantity > 0) {
                            unitPrice = totalValue / rowData.quantity;
                        } else if (rowData.costFromColumn > 0) {
                            unitPrice = rowData.costFromColumn;
                        } else {
                            unitPrice = rowData.product.purchase_price || 0;
                        }

                        movementProducts.push({
                            productId: rowData.product.id,
                            productName: rowData.product.name,
                            quantity: rowData.quantity,
                            priceAtTransaction: unitPrice
                        });
                    }
                }

                if (movementProducts.length > 0) {
                    await createMovement.mutateAsync({
                        type: "inflow",
                        date: new Date().toISOString(),
                        remissionNumber: batchId,
                        branchId: branch.id,
                        branchName: branch.name,
                        providerId: null,
                        providerName: "Inventario Inicial",
                        comment: `Importación masiva Excel - ${batchDate}`,
                        products: movementProducts
                    });
                    successCount += rows.length;
                }
            } catch (e: any) {
                console.error(`Error en sucursal ${branch.name}:`, e);
                errors.push(`Sucursal ${branch.name}: ${e.message}`);
                failCount += rows.length;
            }
        }

        setIsLoading(false);

        if (errors.length > 0 || skippedRows.length > 0) {
            console.group("Resumen de Importación");
            if (errors.length > 0) console.error("Errores:", errors);
            if (skippedRows.length > 0) console.warn("Filas Omitidas:", skippedRows);
            console.groupEnd();
        }

        const skippedNames = Array.from(new Set(skippedRows.map(s => s.Excel_Producto))).slice(0, 10);
        const skippedMsg = skippedRows.length > 0
            ? `\nOmitidos: ${skippedRows.length} filas (ej: ${skippedNames.join(", ")}${skippedRows.length > 10 ? "..." : ""})`
            : "";

        toast.success(`Importación finalizada.`, {
            description: `Se procesaron ${successCount} filas exitosamente.${skippedMsg}\nNota: Los valores se SUMAN al inventario actual.`,
            duration: 10000
        });

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

"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ExcelExportButtonProps {
    type: 'products' | 'branches' | 'providers';
    data: any[]; // The data from the API
    fileName?: string;
}

export function ExcelExportButton({ type, data, fileName }: ExcelExportButtonProps) {

    const handleExport = () => {
        // Define headers and map data based on type
        let headers: string[] = [];
        let formattedData: any[] = [];

        if (type === 'products') {
            headers = ['Nombre', 'Descripción', 'Precio', 'Costo'];
            formattedData = data.map(item => ({
                'Nombre': item.name,
                'Descripción': item.description || '',
                'Precio': item.price,
                'Costo': item.purchase_price || 0
            }));
        } else if (type === 'branches') {
            headers = ['Nombre', 'Ubicación', 'Encargado'];
            formattedData = data.map(item => ({
                'Nombre': item.name,
                'Ubicación': item.location,
                'Encargado': item.encargado || ''
            }));
        } else if (type === 'providers') {
            headers = ['Nombre', 'Contacto', 'Teléfono'];
            formattedData = data.map(item => ({
                'Nombre': item.name,
                'Contacto': item.contact_person || '',
                'Teléfono': item.contact_number || ''
            }));
        }

        // If no data, just create an empty row with headers to serve as a template
        if (formattedData.length === 0) {
            // Create a dummy row with empty strings helps some parsers, but for template just headers is fine.
            // actually sheet_to_json handles array of objects well.
            // If empty, we can't infer headers from data, so we need to be explicit if using utility functions,
            // or just create a worksheet with an array of arrays.
        }

        const worksheet = XLSX.utils.json_to_sheet(formattedData.length > 0 ? formattedData : [], {
            header: headers
        });

        // If empty (template mode), ensure headers are written even if no data
        if (formattedData.length === 0) {
            XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

        const name = fileName || `${type}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, name);
    };

    return (
        <Button variant="outline" onClick={handleExport} className="gap-2" title="Descargar Excel / Plantilla">
            <Download className="w-4 h-4 text-blue-600" />
            Exportar / Plantilla
        </Button>
    );
}

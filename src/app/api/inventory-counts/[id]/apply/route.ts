import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Get the count and its items
        const { data: count, error: countError } = await supabase
            .from('inventory_counts')
            .select('*')
            .eq('id', id)
            .single();

        if (countError) throw countError;
        if (count.status !== 'completado') {
            return NextResponse.json({ error: 'El corte debe estar completado para aplicar ajustes' }, { status: 400 });
        }
        if (count.adjustments_applied) {
            return NextResponse.json({ error: 'Los ajustes ya fueron aplicados' }, { status: 400 });
        }

        const { data: items, error: itemsError } = await supabase
            .from('inventory_count_items')
            .select('*')
            .eq('count_id', id);

        if (itemsError) throw itemsError;

        // 2. Filter items with differences
        const itemsWithDiff = items.filter(item => item.theoretical_quantity !== item.physical_quantity);

        if (itemsWithDiff.length > 0) {
            const remissionNumber = `AJUSTE-CORTE-${count.id.substring(0, 8)}`;

            // Generate movements for each difference
            // We group them by type (inflow/outflow) and create one grouped movement each

            const inflows = itemsWithDiff.filter(i => i.physical_quantity > i.theoretical_quantity);
            const outflows = itemsWithDiff.filter(i => i.physical_quantity < i.theoretical_quantity);

            if (inflows.length > 0) {
                const { error: inflowErr } = await supabase.from('stock_movements').insert(
                    inflows.map((item, idx) => ({
                        product_id: item.product_id,
                        product_name: item.product_name,
                        branch_id: count.branch_id,
                        branch_name: count.branch_name,
                        type: 'inflow',
                        quantity: item.physical_quantity - item.theoretical_quantity,
                        date: new Date().toISOString(),
                        remission_number: remissionNumber,
                        comment: `Ajuste por corte de inventario (Sobrante)`,
                        index_in_transaction: idx
                    }))
                );
                if (inflowErr) throw inflowErr;
            }

            if (outflows.length > 0) {
                const { error: outflowErr } = await supabase.from('stock_movements').insert(
                    outflows.map((item, idx) => ({
                        product_id: item.product_id,
                        product_name: item.product_name,
                        branch_id: count.branch_id,
                        branch_name: count.branch_name,
                        type: 'outflow',
                        quantity: item.theoretical_quantity - item.physical_quantity,
                        date: new Date().toISOString(),
                        remission_number: remissionNumber,
                        comment: `Ajuste por corte de inventario (Faltante)`,
                        index_in_transaction: idx + (inflows.length)
                    }))
                );
                if (outflowErr) throw outflowErr;
            }
        }

        // 3. Mark adjustments as applied
        await supabase
            .from('inventory_counts')
            .update({ adjustments_applied: true })
            .eq('id', id);

        return NextResponse.json({ success: true, message: 'Ajustes aplicados correctamente' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

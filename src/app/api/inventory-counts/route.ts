import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('inventory_counts')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Initial insert of the count header
        const { data, error } = await supabase
            .from('inventory_counts')
            .insert([{
                date: body.date || new Date().toISOString(),
                branch_id: body.branchId,
                branch_name: body.branchName,
                responsible: body.responsible,
                status: 'en progreso',
                notes: body.notes
            }])
            .select()
            .single();

        if (error) throw error;

        // body.items would be the snapshot of products for that branch
        if (body.items && body.items.length > 0) {
            const itemsToInsert = body.items.map((item: any) => ({
                count_id: data.id,
                product_id: item.productId,
                product_name: item.productName,
                initial_quantity: item.initialQuantity || 0,
                inflow_quantity: item.inflowQuantity || 0,
                outflow_quantity: item.outflowQuantity || 0,
                theoretical_quantity: item.theoreticalQuantity,
                physical_quantity: item.physicalQuantity || 0,
                difference: (item.physicalQuantity || 0) - item.theoreticalQuantity
            }));

            const { error: itemsError } = await supabase
                .from('inventory_count_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

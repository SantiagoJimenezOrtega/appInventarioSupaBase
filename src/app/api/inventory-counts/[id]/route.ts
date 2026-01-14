import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data: count, error: countError } = await supabase
            .from('inventory_counts')
            .select('*')
            .eq('id', id)
            .single();

        if (countError) throw countError;

        const { data: items, error: itemsError } = await supabase
            .from('inventory_count_items')
            .select('*')
            .eq('count_id', id);

        if (itemsError) throw itemsError;

        return NextResponse.json({ ...count, items });
    } catch (error: any) {
        console.error('Error in GET /api/inventory-counts/[id]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Separate header and items updates if necessary
        const { items, ...headerData } = body;

        if (Object.keys(headerData).length > 0) {
            const { error: headerError } = await supabase
                .from('inventory_counts')
                .update(headerData)
                .eq('id', id);

            if (headerError) throw headerError;
        }

        if (items && Array.isArray(items)) {
            // Bulk update items - actually upserting by ID if provided or just replacing/updating
            // For simplicity in a prototype/MVP, we might delete and re-insert or update individually
            // Let's do individual updates for each item in the list
            for (const item of items) {
                if (item.id) {
                    await supabase
                        .from('inventory_count_items')
                        .update({
                            physical_quantity: item.physical_quantity,
                            difference: item.physical_quantity - item.theoretical_quantity
                        })
                        .eq('id', item.id);
                }
            }
        }

        return NextResponse.json({ message: 'Updated successfully' });
    } catch (error: any) {
        console.error('Error in PATCH /api/inventory-counts/[id]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

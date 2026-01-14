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
            // Bulk update items using upsert for significantly better performance
            const { error: itemsError } = await supabase
                .from('inventory_count_items')
                .upsert(items.map(item => ({
                    ...item,
                    // Ensure count_id is correctly set if not present
                    count_id: id
                })));

            if (itemsError) throw itemsError;
        }

        return NextResponse.json({ message: 'Updated successfully' });
    } catch (error: any) {
        console.error('Error in PATCH /api/inventory-counts/[id]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { error } = await supabase
            .from('inventory_counts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error: any) {
        console.error('Error in DELETE /api/inventory-counts/[id]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

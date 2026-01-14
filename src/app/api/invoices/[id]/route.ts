import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });
        }

        // Delete payments associated with the invoice first if NO cascading is set
        // But usually, it's better to let Supabase handle it if foreign keys are set to CASCADE.
        // For safety, let's delete payments first.
        await supabase
            .from('invoice_payments')
            .delete()
            .eq('invoice_id', id);

        const { error } = await supabase
            .from('payable_invoices')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

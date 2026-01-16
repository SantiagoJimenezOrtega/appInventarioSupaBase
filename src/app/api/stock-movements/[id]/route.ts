import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { error } = await supabase
            .from('stock_movements')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error:', error);
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

        const { data, error } = await supabase
            .from('stock_movements')
            .update(body)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Recalculate invoice if quantity or price changed and it's an inflow
        if ((body.quantity || body.price_at_transaction) && data.type === 'inflow') {
            const { data: allItems } = await supabase
                .from('stock_movements')
                .select('quantity, price_at_transaction')
                .eq('remission_number', data.remission_number);

            const newTotal = allItems?.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price_at_transaction)), 0) || 0;

            // We also need to add IVA/Retefuente from the invoice to check consistency? 
            // Currently the create logic adds them. Updates here only touch subtotal.
            // If we just sum items * price, we get subtotal.
            // We need to fetch the existing invoice to get its IVA/Retefuente adjustments if stored separately,
            // OR assuming `total_amount` in invoice == `subtotal`.
            // Wait, `create` logic: `const newTotal = currentTotal + newSubtotal`.
            // Actually, `payable_invoices` likely has `iva` and `retefuente` columns if I recall `route.ts`.
            // Let's check `route.ts`... yes lines 111: `currentTotal + newSubtotal`.
            // And `invoiceToInsert` has `iva`, `retefuente`.
            // So `total_amount` = `subtotal` + `iva` - `retefuente`.

            // We need to fetch the invoice to preserve tax values if they are static, or re-calculate them?
            // Assuming tax values are on the invoice row.

            const { data: invoice } = await supabase
                .from('payable_invoices')
                .select('iva, retefuente')
                .eq('remission_number', data.remission_number)
                .single();

            const iva = Number(invoice?.iva || 0);
            const retefuente = Number(invoice?.retefuente || 0);

            const finalTotal = newTotal + iva - retefuente;

            await supabase
                .from('payable_invoices')
                .update({ total_amount: finalTotal })
                .eq('remission_number', data.remission_number);
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

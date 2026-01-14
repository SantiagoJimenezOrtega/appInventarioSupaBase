import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { invoice_id, amount, date } = body;

        if (!invoice_id || !amount || !date) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Insert the payment
        const { data: payment, error: payError } = await supabase
            .from('invoice_payments')
            .insert({
                invoice_id,
                amount,
                date
            })
            .select()
            .single();

        if (payError) throw payError;

        // 2. Update the invoice status
        // First, get all payments for this invoice to calculate new status
        const { data: allPayments, error: fetchError } = await supabase
            .from('invoice_payments')
            .select('amount')
            .eq('invoice_id', invoice_id);

        if (fetchError) throw fetchError;

        const { data: invoice, error: invFetchError } = await supabase
            .from('payable_invoices')
            .select('total_amount')
            .eq('id', invoice_id)
            .single();

        if (invFetchError) throw invFetchError;

        const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        let status: 'Pendiente' | 'Pagado Parcialmente' | 'Pagado' = 'Pendiente';

        if (totalPaid >= Number(invoice.total_amount)) {
            status = 'Pagado';
        } else if (totalPaid > 0) {
            status = 'Pagado Parcialmente';
        }

        const { error: updateError } = await supabase
            .from('payable_invoices')
            .update({ payment_status: status })
            .eq('id', invoice_id);

        if (updateError) throw updateError;

        return NextResponse.json(payment);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

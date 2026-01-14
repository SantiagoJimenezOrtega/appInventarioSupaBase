import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
    try {
        // Fetch invoices
        const { data: invoices, error: invError } = await supabase
            .from('payable_invoices')
            .select('*')
            .order('date', { ascending: false });

        if (invError) throw invError;

        // Fetch payments to calculate paid amount and history
        const { data: payments, error: payError } = await supabase
            .from('invoice_payments')
            .select('*');

        if (payError) throw payError;

        // Combine data
        const enrichedInvoices = invoices.map(invoice => {
            const invoicePayments = payments.filter(p => p.invoice_id === invoice.id);
            const paidAmount = invoicePayments.reduce((sum, p) => sum + Number(p.amount), 0);
            return {
                ...invoice,
                paid_amount: paidAmount,
                pending_balance: Number(invoice.total_amount) - paidAmount,
                payment_history: invoicePayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            };
        });

        return NextResponse.json(enrichedInvoices);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

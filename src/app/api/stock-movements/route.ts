import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');
        const branchId = searchParams.get('branchId');
        const type = searchParams.get('type');

        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        console.log('--- INICIANDO CARGA RECURSIVA DE MOVIMIENTOS ---');

        while (hasMore) {
            let query = supabase
                .from('stock_movements')
                .select('*')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })
                .order('id', { ascending: false })
                .range(from, from + step - 1);

            if (productId) query = query.eq('product_id', productId);
            if (branchId) query = query.eq('branch_id', branchId);
            if (type) query = query.eq('type', type);

            const { data, error } = await query;

            if (error) {
                console.error('Error en ráfaga de movimientos:', error);
                throw error;
            }

            if (data && data.length > 0) {
                allData = [...allData, ...data];
                from += step;
                // If we got fewer than the step, we reached the end
                if (data.length < step) hasMore = false;
            } else {
                hasMore = false;
            }

            // Safety limit to avoid infinite loops
            if (from > 50000) hasMore = false;
        }

        console.log(`--- CARGA COMPLETADA: ${allData.length} registros recuperados ---`);
        return NextResponse.json(allData);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, date, remissionNumber, products, ...rest } = body;

        const movementsToInsert: any[] = [];
        let invoiceToInsert: any = null;

        if (type === 'inflow') {
            // ENTRADA
            if (Array.isArray(products)) {
                products.forEach((item: any, i: number) => {
                    movementsToInsert.push({
                        product_id: item.productId,
                        product_name: item.productName,
                        branch_id: rest.branchId,
                        branch_name: rest.branchName,
                        type: 'inflow',
                        quantity: item.quantity,
                        date,
                        price_at_transaction: item.priceAtTransaction,
                        remission_number: remissionNumber,
                        provider_id: rest.providerId,
                        provider_name: rest.providerName,
                        comment: `Proveedor: ${rest.providerName || ''} - ${rest.comment || ''}`,
                        index_in_transaction: i
                    });
                });
            }

            if (rest.providerId) {
                const subtotal = (products || []).reduce((sum: number, p: any) =>
                    sum + (Number(p.quantity) * Number(p.priceAtTransaction)), 0
                );

                // Check if invoice already exists to update it instead of creating duplicate
                const { data: existingInvoice } = await supabase
                    .from('payable_invoices')
                    .select('id, total_amount')
                    .eq('remission_number', remissionNumber)
                    .maybeSingle();

                if (existingInvoice) {
                    const currentTotal = Number(existingInvoice.total_amount || 0);
                    const newSubtotal = subtotal + (Number(rest.iva) || 0) - (Number(rest.retefuente) || 0);
                    const newTotal = currentTotal + newSubtotal;

                    await supabase
                        .from('payable_invoices')
                        .update({ total_amount: newTotal })
                        .eq('id', existingInvoice.id);
                } else {
                    const totalAmount = subtotal + (Number(rest.iva) || 0) - (Number(rest.retefuente) || 0);
                    invoiceToInsert = {
                        remission_number: remissionNumber,
                        date,
                        provider_id: rest.providerId,
                        provider_name: rest.providerName,
                        total_amount: totalAmount,
                        payment_status: 'Pendiente',
                        due_date: rest.dueDate,
                        iva: rest.iva || 0,
                        retefuente: rest.retefuente || 0
                    };
                }
            }
        }
        else if (type === 'outflow') {
            // SALIDA
            let commentPrefix = '';
            if (rest.clientType === 'mostrador') commentPrefix = 'Venta en mostrador';
            else if (rest.clientType === 'electronica') commentPrefix = `Fact. Elec. N° ${rest.electronicInvoiceNumber}`;
            else if (rest.clientType === 'remision') commentPrefix = `Remisión Ref: ${rest.remisionReference}`;
            else commentPrefix = `Cliente: ${rest.clientType}`;

            if (Array.isArray(products)) {
                products.forEach((item: any, i: number) => {
                    movementsToInsert.push({
                        product_id: item.productId,
                        product_name: item.productName,
                        branch_id: rest.branchId,
                        branch_name: rest.branchName,
                        type: 'outflow',
                        quantity: item.quantity,
                        date,
                        price_at_transaction: item.priceAtTransaction,
                        remission_number: remissionNumber,
                        comment: `${commentPrefix} - ${rest.comment || ''}`,
                        index_in_transaction: i
                    });
                });
            }
        }
        else if (type === 'transfer') {
            // TRASLADO
            if (Array.isArray(products)) {
                products.forEach((item: any, i: number) => {
                    // Outflow Origin
                    movementsToInsert.push({
                        product_id: item.productId,
                        product_name: item.productName,
                        branch_id: rest.fromBranchId,
                        branch_name: rest.fromBranchName,
                        type: 'transfer',
                        quantity: -Number(item.quantity), // Negative for outflow
                        date,
                        price_at_transaction: item.priceAtTransaction,
                        remission_number: remissionNumber,
                        comment: `Traslado hacia ${rest.toBranchName} - ${rest.comment || ''}`,
                        index_in_transaction: i * 2
                    });

                    // Inflow Dest
                    movementsToInsert.push({
                        product_id: item.productId,
                        product_name: item.productName,
                        branch_id: rest.toBranchId,
                        branch_name: rest.toBranchName,
                        type: 'transfer',
                        quantity: Number(item.quantity), // Positive for inflow
                        date,
                        price_at_transaction: item.priceAtTransaction,
                        remission_number: remissionNumber,
                        comment: `Traslado desde ${rest.fromBranchName} - ${rest.comment || ''}`,
                        index_in_transaction: i * 2 + 1
                    });
                });
            }
        }
        else if (type === 'conversion') {
            // CONVERSIÓN
            movementsToInsert.push({
                product_id: rest.fromProductId,
                product_name: rest.fromProductName,
                branch_id: rest.branchId,
                branch_name: rest.branchName,
                type: 'conversion',
                quantity: -Number(rest.fromQuantity), // Negative for outflow
                date,
                price_at_transaction: rest.priceAtTransaction,
                remission_number: remissionNumber,
                comment: `Salida por conversión a ${rest.toProductName} - ${rest.comment || ''}`,
                index_in_transaction: 0
            });
            movementsToInsert.push({
                product_id: rest.toProductId,
                product_name: rest.toProductName,
                branch_id: rest.branchId,
                branch_name: rest.branchName,
                type: 'conversion',
                quantity: Number(rest.toQuantity), // Positive for inflow
                date,
                price_at_transaction: rest.priceAtTransaction,
                remission_number: remissionNumber,
                comment: `Entrada por conversión desde ${rest.fromProductName} - ${rest.comment || ''}`,
                index_in_transaction: 1
            });
        }

        // EXECUTE
        if (movementsToInsert.length > 0) {
            // Handle insertion at specific index (Re-indexing strategy)
            if (typeof rest.insertAtIndex === 'number') {
                // 1. Shift existing items down to make space.
                const { data: itemsToShift } = await supabase
                    .from('stock_movements')
                    .select('id, index_in_transaction')
                    .eq('remission_number', remissionNumber)
                    .gte('index_in_transaction', rest.insertAtIndex)
                    .order('index_in_transaction', { ascending: false });

                if (itemsToShift && itemsToShift.length > 0) {
                    for (const item of itemsToShift) {
                        await supabase
                            .from('stock_movements')
                            .update({ index_in_transaction: item.index_in_transaction + movementsToInsert.length })
                            .eq('id', item.id);
                    }
                }

                // 2. Insert new items at the specific index
                const finalInserts = movementsToInsert.map((m, i) => ({
                    ...m,
                    index_in_transaction: rest.insertAtIndex + i
                }));

                const { error: movError } = await supabase.from('stock_movements').insert(finalInserts);
                if (movError) {
                    console.error('StockMovement Insert Error:', movError);
                    return NextResponse.json({ error: movError.message }, { status: 500 });
                }
            } else {
                // Standard Insert (Append or New)
                const { error: movError } = await supabase.from('stock_movements').insert(movementsToInsert);
                if (movError) {
                    console.error('StockMovement Insert Error:', movError);
                    return NextResponse.json({ error: movError.message }, { status: 500 });
                }
            }
        }

        if (invoiceToInsert) {
            const { error: invError } = await supabase.from('payable_invoices').insert(invoiceToInsert);
            if (invError) {
                console.error("Invoice Insert Error", invError);
                // Note: transactions partial failure possible here
                return NextResponse.json({ error: "Movements created but Invoice failed: " + invError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const remissionNumber = searchParams.get('remissionNumber');

        if (!remissionNumber) {
            return NextResponse.json({ error: "Missing remissionNumber" }, { status: 400 });
        }

        const { error } = await supabase
            .from('stock_movements')
            .delete()
            .eq('remission_number', remissionNumber);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const remissionNumber = searchParams.get('remissionNumber');
        const id = searchParams.get('id');
        const body = await request.json();

        if (id) {
            // Update specific movement
            const { error } = await supabase
                .from('stock_movements')
                .update(body)
                .eq('id', id);

            if (error) throw error;

            // Recalculate invoice if quantity or price changed
            if (body.quantity || body.price_at_transaction) {
                const { data: movement } = await supabase
                    .from('stock_movements')
                    .select('remission_number, type')
                    .eq('id', id)
                    .single();

                if (movement && movement.type === 'inflow') {
                    const { data: allItems } = await supabase
                        .from('stock_movements')
                        .select('quantity, price_at_transaction')
                        .eq('remission_number', movement.remission_number);

                    const newTotal = allItems?.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price_at_transaction)), 0) || 0;

                    await supabase
                        .from('payable_invoices')
                        .update({ total_amount: newTotal })
                        .eq('remission_number', movement.remission_number);
                }
            }

            return NextResponse.json({ success: true });
        }

        if (!remissionNumber) {
            return NextResponse.json({ error: "Missing remissionNumber or id" }, { status: 400 });
        }

        const { error } = await supabase
            .from('stock_movements')
            .update(body)
            .eq('remission_number', remissionNumber);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

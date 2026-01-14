import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name');

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // Basic validation could go here
        const { data, error } = await supabase
            .from('products')
            .insert([body])
            .select();

        if (error) throw error;

        return NextResponse.json(data[0]);
    } catch (error: any) {
        console.error("Error creating product:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

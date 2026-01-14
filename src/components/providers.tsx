"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/auth-context";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner"; // Using Sonner usually or Toaster

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                {children}
                {/* <Toaster /> if I had one */}
            </AuthProvider>
        </QueryClientProvider>
    );
}

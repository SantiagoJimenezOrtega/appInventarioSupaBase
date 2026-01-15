"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner"; // Using Sonner usually or Toaster

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
            },
        },
    }));

    useEffect(() => {
        // Load theme color preference
        const savedTheme = localStorage.getItem("app_theme_color");
        if (savedTheme) {
            document.documentElement.style.setProperty('--primary', savedTheme);
        }
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                {children}
                <Toaster />
            </AuthProvider>
        </QueryClientProvider>
    );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Package,
    Store,
    Truck,
    ArrowRightLeft,
    ClipboardList,
    Calculator,
    Wallet,
    Brain,
    Sprout,
    TrendingUp
} from "lucide-react";

export default function SidebarNav() {
    const pathname = usePathname();

    const navItems = [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { title: "Productos", href: "/products", icon: Package },
        { title: "Sucursales", href: "/branches", icon: Store },
        { title: "Proveedores", href: "/providers", icon: Truck },
        { title: "Movimientos", href: "/stock-log", icon: ArrowRightLeft },
        { title: "Inventario FIFO", href: "/inventory", icon: ClipboardList },
        { title: "Cortes de Inventario", href: "/inventory-counts", icon: Calculator },
        { title: "Cartera", href: "/cartera", icon: Wallet },
        { title: "Copiloto IA", href: "/ia-chat", icon: Brain },
    ];

    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadLogo = () => {
            const storedLogo = localStorage.getItem("app_logo_url");
            setLogoUrl(storedLogo);
        };

        loadLogo();
        window.addEventListener('storage', loadLogo);
        return () => window.removeEventListener('storage', loadLogo);
    }, []);

    return (
        <aside className="hidden md:flex w-64 flex-col bg-white border-r min-h-screen">
            <div className="p-6 flex items-center gap-2 border-b h-20">
                {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-10 object-contain w-full" />
                ) : (
                    <>
                        <div className="bg-primary/10 p-2 rounded-full">
                            <Sprout className="w-6 h-6 text-primary" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">AgroInsumos</span>
                    </>
                )}
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary-foreground font-semibold"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            )}
                            style={isActive ? { backgroundColor: 'hsl(120, 100%, 50%, 0.1)', color: 'hsl(120, 100%, 25%)' } : {}}
                        >
                            <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                            {item.title}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t text-xs text-gray-400 text-center">
                v1.0.0
            </div>
        </aside>
    );
}

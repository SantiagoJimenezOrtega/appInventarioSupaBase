"use client";

import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Sprout } from "lucide-react";

export default function LoginPage() {
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const form = e.target as HTMLFormElement;
        const email = form.email.value;
        const password = form.password.value;

        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-primary to-yellow-300">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />

            <Card className="w-full max-w-md relative z-10 border-white/20 bg-white/80 backdrop-blur-md shadow-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/20 p-3 rounded-full w-fit mb-4">
                        <Sprout className="w-10 h-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-800">Sistema AgroInv</CardTitle>
                    <CardDescription>Inicia sesión para gestionar tu inventario</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                defaultValue="admin@agroinsumos.com"
                                className="bg-white/50"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                defaultValue="Admin12345."
                                className="bg-white/50"
                                required
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin mr-2" /> : "Ingresar"}
                        </Button>

                        <div className="mt-4 text-xs text-center text-gray-500">
                            <p>Demo: admin@agroinsumos.com / Admin12345.</p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, AlertTriangle, TrendingUp, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Insight {
    title: string;
    description: string;
    type: "warning" | "info" | "success";
}

export function AIInsights() {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/ai/analyze", { method: "POST" });
            const data = await response.json();
            if (Array.isArray(data)) {
                setInsights(data);
            }
        } catch (error) {
            console.error("Error fetching AI insights:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case "warning": return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case "success": return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            default: return <TrendingUp className="w-5 h-5 text-blue-500" />;
        }
    };

    const getColorClass = (type: string) => {
        switch (type) {
            case "warning": return "border-amber-100 bg-amber-50/50";
            case "success": return "border-emerald-100 bg-emerald-50/50";
            default: return "border-blue-100 bg-blue-50/50";
        }
    };

    return (
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 shadow-xl backdrop-blur-sm">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24 text-indigo-500" />
            </div>

            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                    </div>
                    <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        Copiloto Estratégico IA
                    </CardTitle>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={fetchInsights}
                    disabled={isLoading}
                    className="hover:bg-indigo-100 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 text-indigo-600 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
            </CardHeader>

            <CardContent>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="text-sm text-indigo-600 font-medium animate-pulse">Analizando datos de inventario...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        {insights.map((insight, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-xl border transition-all hover:shadow-md ${getColorClass(insight.type)}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    {getIcon(insight.type)}
                                    <h3 className="font-bold text-sm text-gray-800">{insight.title}</h3>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    {insight.description}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

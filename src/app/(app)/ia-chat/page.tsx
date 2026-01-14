"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, Sidebar as SidebarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
    role: "user" | "ai";
    content: string;
}

export default function IAChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", content: "¡Hola! Soy tu Copiloto Estratégico. ¿En qué puedo ayudarte hoy con tu inventario?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage, history: messages })
            });
            const data = await response.json();
            setMessages(prev => [...prev, { role: "ai", content: data.reply }]);
        } catch (error) {
            console.error("Error in AI chat:", error);
            setMessages(prev => [...prev, { role: "ai", content: "Lo siento, tuve un problema técnico. ¿Podemos intentarlo de nuevo?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        Chat Inteligente
                    </h1>
                    <p className="text-muted-foreground">Consulta tu inventario en lenguaje natural.</p>
                </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-xl bg-gray-50/30 backdrop-blur-sm">
                <CardHeader className="border-b bg-white/50">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        <CardTitle className="text-sm font-medium">Asistente Agroinv</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((m, idx) => (
                                <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[80%] flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                                        <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-indigo-600" : "bg-white border shadow-sm"}`}>
                                            {m.role === "user" ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-indigo-600" />}
                                        </div>
                                        <div className={`p-3 rounded-2xl text-sm ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-white border shadow-sm text-gray-800"}`}>
                                            {m.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] flex gap-3">
                                        <div className="mt-1 h-8 w-8 rounded-full bg-white border shadow-sm flex items-center justify-center shrink-0">
                                            <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                                        </div>
                                        <div className="p-3 rounded-2xl bg-white border shadow-sm text-gray-400 text-sm">
                                            Pensando...
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>
                    </ScrollArea>

                    <div className="p-4 bg-white/50 border-t">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Escribe tu consulta aquí... (ej: ¿Cuáles son los productos con menos de 10 unidades?)"
                                className="flex-1 bg-white"
                                disabled={isLoading}
                            />
                            <Button type="submit" disabled={isLoading || !input.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings, Save, Palette, Clock, Trash2, User, Lock, Image as ImageIcon } from "lucide-react";

export default function SettingsPage() {
    const { user, updateProfile } = useAuth();

    // System Settings State
    const [themeColor, setThemeColor] = useState("#000000");
    const [timezone, setTimezone] = useState("America/Bogota");
    const [logoUrl, setLogoUrl] = useState("");

    // Profile Settings State
    const [profileName, setProfileName] = useState("");
    const [profileEmail, setProfileEmail] = useState("");
    const [profileAvatar, setProfileAvatar] = useState("");
    const [currentPassword, setCurrentPassword] = useState(""); // Not strictly checked against old pw in this mock
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Load System settings
    useEffect(() => {
        const savedTheme = localStorage.getItem("app_theme_color");
        const savedTimezone = localStorage.getItem("app_timezone");
        const savedLogo = localStorage.getItem("app_logo_url");

        if (savedTheme) setThemeColor(savedTheme);
        if (savedTimezone) setTimezone(savedTimezone);
        if (savedLogo) setLogoUrl(savedLogo);
    }, []);

    // Load Profile settings
    useEffect(() => {
        if (user) {
            setProfileName(user.name || "");
            setProfileEmail(user.email || "");
            setProfileAvatar(user.avatar_url || "");
        }
    }, [user]);

    const handleSaveSystem = () => {
        localStorage.setItem("app_theme_color", themeColor);
        localStorage.setItem("app_timezone", timezone);
        localStorage.setItem("app_logo_url", logoUrl);
        document.documentElement.style.setProperty('--primary', themeColor);
        window.dispatchEvent(new Event('storage'));
        toast.success("Configuración del sistema actualizada");
    };

    const handleSaveProfile = () => {
        if (newPassword && newPassword !== confirmPassword) {
            toast.error("Las contraseñas nuevas no coinciden");
            return;
        }

        try {
            updateProfile({
                name: profileName,
                email: profileEmail,
                avatar_url: profileAvatar,
                ...(newPassword ? { password: newPassword } : {})
            });

            setNewPassword("");
            setConfirmPassword("");
            setCurrentPassword("");
            toast.success("Perfil actualizado exitosamente");
        } catch (error) {
            toast.error("Error al actualizar perfil");
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gray-100 rounded-lg">
                    <Settings className="w-8 h-8 text-gray-700" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                    <p className="text-muted-foreground">Gestiona tus preferencias y perfil.</p>
                </div>
            </div>

            <Tabs defaultValue="system" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="system">Sistema</TabsTrigger>
                    <TabsTrigger value="profile">Mi Perfil</TabsTrigger>
                </TabsList>

                <TabsContent value="system" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-blue-500" />
                                    Apariencia
                                </CardTitle>
                                <CardDescription>Personaliza los colores y logo.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Color Principal</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={themeColor}
                                            onChange={(e) => setThemeColor(e.target.value)}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={themeColor}
                                            onChange={(e) => setThemeColor(e.target.value)}
                                            className="uppercase font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Logo del Sistema</Label>
                                    <div className="grid w-full max-w-sm items-center gap-1.5">
                                        <Label htmlFor="logo" className="text-xs text-muted-foreground">Cargar imagen (max 1MB)</Label>
                                        <Input
                                            id="logo" type="file" accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.size > 1024 * 1024) return toast.error("Máximo 1MB");
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setLogoUrl(reader.result as string);
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </div>
                                    {logoUrl && (
                                        <div className="mt-2 p-4 border rounded-md bg-gray-50 flex justify-center relative group">
                                            <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
                                            <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => setLogoUrl("")}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-green-500" />
                                    Región
                                </CardTitle>
                                <CardDescription>Configuración regional.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Zona Horaria</Label>
                                    <Select value={timezone} onValueChange={setTimezone}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="America/Bogota">Colombia (GMT-5)</SelectItem>
                                            <SelectItem value="America/Mexico_City">México (GMT-6)</SelectItem>
                                            <SelectItem value="America/New_York">Nueva York (GMT-5)</SelectItem>
                                            <SelectItem value="UTC">UTC</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSaveSystem}>
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Cambios del Sistema
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="profile" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5 text-purple-500" />
                                Información Personal
                            </CardTitle>
                            <CardDescription>Gestiona tu foto de perfil y datos de acceso.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                {/* Auto-Avatar Section */}
                                <div className="space-y-3 flex flex-col items-center">
                                    <div className="h-32 w-32 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50 flex items-center justify-center relative group">
                                        {profileAvatar ? (
                                            <img src={profileAvatar} alt="Profile" className="h-full w-full object-cover" />
                                        ) : (
                                            <User className="w-12 h-12 text-gray-300" />
                                        )}
                                        <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <ImageIcon className="text-white w-8 h-8" />
                                        </label>
                                        <Input
                                            id="avatar-upload" type="file" accept="image/*" className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.size > 1024 * 1024) return toast.error("Máximo 1MB");
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setProfileAvatar(reader.result as string);
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Clic para cambiar</p>
                                    {profileAvatar && (
                                        <Button variant="ghost" size="sm" className="text-red-500 h-6 text-xs" onClick={() => setProfileAvatar("")}>
                                            Eliminar foto
                                        </Button>
                                    )}
                                </div>

                                <div className="flex-1 space-y-4 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Nombre Completo</Label>
                                            <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Correo Electrónico</Label>
                                            <Input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-gray-500" />
                                            Cambiar Contraseña
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Nueva Contraseña</Label>
                                                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Dejar en blanco para mantener" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Confirmar Contraseña</Label>
                                                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetir nueva contraseña" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex justify-end">
                        <Button onClick={handleSaveProfile} className="bg-purple-600 hover:bg-purple-700">
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Perfil
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

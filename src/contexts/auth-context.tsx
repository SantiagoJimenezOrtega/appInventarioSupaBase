"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const ADMIN_USER = {
    id: '1',
    email: 'admin@agroinsumos.com',
    password: 'Admin12345.',
    name: 'Administrador',
    role: 'admin'
};

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar_url?: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => void;
    updateProfile: (data: Partial<User> & { password?: string }) => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check localStorage on mount
        const stored = localStorage.getItem('currentUser');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                localStorage.removeItem('currentUser');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, pass: string) => {
        // Simulate API delay
        await new Promise(r => setTimeout(r, 500));

        // Load custom creds if any, else default
        const storedCreds = localStorage.getItem('admin_credentials');
        const validCreds = storedCreds ? JSON.parse(storedCreds) : ADMIN_USER;

        if (email === validCreds.email && pass === validCreds.password) {
            const u = { ...validCreds };
            // @ts-ignore
            delete u.password;
            setUser(u);
            localStorage.setItem('currentUser', JSON.stringify(u));
            localStorage.setItem('agro_app_auth_flag', 'true');
            router.push('/dashboard');
        } else {
            throw new Error('Credenciales inválidas');
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('agro_app_auth_flag');
        router.push('/login');
    };

    const updateProfile = (data: Partial<User> & { password?: string }) => {
        if (!user) return;

        const updatedUser = { ...user, ...data };
        // @ts-ignore
        const { password, ...safeUser } = updatedUser;

        setUser(safeUser as User);
        localStorage.setItem('currentUser', JSON.stringify(safeUser));

        // Persist login credentials
        const storedCreds = localStorage.getItem('admin_credentials');
        const currentCreds = storedCreds ? JSON.parse(storedCreds) : ADMIN_USER;

        const newCreds = {
            ...currentCreds,
            name: data.name || currentCreds.name,
            email: data.email || currentCreds.email,
            avatar_url: data.avatar_url || currentCreds.avatar_url,
            password: data.password || currentCreds.password
        };

        localStorage.setItem('admin_credentials', JSON.stringify(newCreds));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateProfile, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}


export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

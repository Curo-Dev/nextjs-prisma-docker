'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
    id: number;
    email: string;
    createdAt: string;
    updatedAt: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 페이지 로드 시 세션스토리지에서 토큰 확인
        const token = sessionStorage.getItem('accessToken');
        const userData = sessionStorage.getItem('user');

        if (token && userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
            } catch (error) {
                console.error('Failed to parse user data:', error);
                // 잘못된 데이터가 있으면 제거
                sessionStorage.removeItem('accessToken');
                sessionStorage.removeItem('user');
            }
        }

        setLoading(false);
    }, []);

    const login = (token: string, userData: User) => {
        sessionStorage.setItem('accessToken', token);
        sessionStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('user');
        setUser(null);
    };

    const value = {
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
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
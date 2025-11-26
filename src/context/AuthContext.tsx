import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
    token: string;
    user_id?: string;
    username?: string;
    email?: string;
    avatarUrl?: string;
    location?: string;
}

interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Check for logged in user on mount
        const storedUser = localStorage.getItem('logged_user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
            } catch (error) {
                console.error('Failed to parse user data:', error);
                localStorage.removeItem('logged_user');
            }
        }
    }, []);

    const logout = () => {
        localStorage.removeItem('logged_user');
        localStorage.removeItem('nk_session');
        localStorage.removeItem('user_session');
        localStorage.removeItem('nk_device_id');
        setUser(null);
        window.location.href = '/';
    };

    const value: AuthContextType = {
        user,
        setUser,
        logout,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

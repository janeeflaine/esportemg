'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Check if user is super admin by email
        if (currentUser.email === 'janeeflaine@gmail.com' || currentUser.email === 'janeeflaine+1@gmail.com') {
          setIsAdmin(true);
        } else {
          // Check role in Firestore
          try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().role === 'admin') {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch (error) {
            console.error('Error fetching user role:', error);
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

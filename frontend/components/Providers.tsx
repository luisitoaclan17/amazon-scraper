"use client";

import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  const initialize = useAuthStore((state) => state.initialize);
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  // Initialize auth state from local storage on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Fetch current user details if token is found
  useEffect(() => {
    if (token) {
      api.get<any>("/auth/me")
        .then((user) => {
          setUser(user);
        })
        .catch(() => {
          // Token expired or invalid
          logout();
        });
    }
  }, [token, setUser, logout]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

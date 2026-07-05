"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    // Wait slightly to read localStorage initialized state
    const timer = setTimeout(() => {
      if (token || isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [token, isAuthenticated, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <Sparkles className="w-12 h-12 text-blue-500 animate-spin" style={{ animationDuration: '4s' }} />
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
          Loading Amazon Research Assistant...
        </h1>
      </div>
    </div>
  );
}

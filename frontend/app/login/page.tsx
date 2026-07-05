"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Sparkles, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Submit login with JSON body (backend expects email + password as JSON)
      const tokenRes = await api.post<any>("/auth/login", {
        email: data.email,
        password: data.password,
      });

      // Save token in store
      localStorage.setItem("token", tokenRes.access_token);

      // 2. Fetch authenticated user details
      const userRes = await api.get<any>("/auth/me", {
        headers: {
          Authorization: `Bearer ${tokenRes.access_token}`
        }
      });

      setAuth(tokenRes.access_token, userRes);
      router.push("/dashboard");
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.detail);
      } else {
        setErrorMsg("Failed to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-950">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-md glass-card rounded-2xl p-8 animate-slide-up">
        {/* Title / Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Welcome back
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Log in to manage your scraping jobs
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm"
                {...register("email", { 
                  required: "Email is required", 
                  pattern: { value: /^\S+@\S+$/i, message: "Invalid email" }
                })}
              />
            </div>
            {errors.email && (
              <span className="text-xs text-red-400 mt-1 block">
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <Link 
                href="/forgot-password" 
                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm"
                {...register("password", { 
                  required: "Password is required",
                  minLength: { value: 6, message: "Password must be at least 6 characters" }
                })}
              />
            </div>
            {errors.password && (
              <span className="text-xs text-red-400 mt-1 block">
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 border border-blue-500/30 hover:border-blue-400/50 shadow-lg shadow-blue-500/10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footnote */}
        <div className="text-center mt-8 pt-6 border-t border-slate-900">
          <p className="text-sm text-slate-400">
            Don't have an account?{" "}
            <Link 
              href="/register" 
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

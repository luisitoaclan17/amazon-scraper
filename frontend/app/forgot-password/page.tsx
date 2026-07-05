"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Sparkles, Mail, Loader2, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setSuccess(true);
    } catch (err) {
      // Direct message display since it mocks a 200 message in config
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-950">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-md glass-card rounded-2xl p-8 animate-slide-up">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 text-center">
            Reset Password
          </h2>
          <p className="text-sm text-slate-400 mt-1 text-center">
            {success 
              ? "Check your inbox for a recovery link" 
              : "Enter your email to receive a password reset link"}
          </p>
        </div>

        {success ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              We have sent a password reset link to the email address provided if it exists in our system.
            </div>
            
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white font-medium transition-colors mt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="name@company.com"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 border border-blue-500/30 hover:border-blue-400/50 shadow-lg shadow-blue-500/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Link...
                </>
              ) : (
                "Send Password Reset Link"
              )}
            </button>

            <div className="text-center mt-4">
              <Link 
                href="/login" 
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

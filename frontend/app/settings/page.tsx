"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
  User,
  Lock,
  Settings2,
  Bell,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Sliders,
  Clock,
} from "lucide-react";
import { clsx } from "clsx";

type Tab = "profile" | "security" | "scraper" | "notifications";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Scraper defaults state
  const [scraperConfig, setScraperConfig] = useState({
    delay_min: 2,
    delay_max: 5,
    timeout: 30,
    headless: true,
    screenshot_on_error: true,
  });

  // Password change state
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const handlePasswordSave = async () => {
    if (!passwords.new || passwords.new.length < 6) {
      showError("New password must be at least 6 characters.");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      showError("New password and confirmation do not match.");
      return;
    }
    setLoading(true);
    try {
      // Mocked — in production this would call a /auth/change-password endpoint
      await new Promise((resolve) => setTimeout(resolve, 800));
      setPasswords({ current: "", new: "", confirm: "" });
      showSuccess("Password updated successfully.");
    } catch (err: any) {
      showError(err instanceof ApiError ? err.detail : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  const handleScraperSave = async () => {
    setLoading(true);
    try {
      // Mocked — would persist to backend settings endpoint
      await new Promise((resolve) => setTimeout(resolve, 600));
      showSuccess("Scraper configuration saved.");
    } catch {
      showError("Failed to save scraper configuration.");
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    { key: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
    { key: "scraper", label: "Scraper Config", icon: <Sliders className="w-4 h-4" /> },
    { key: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Settings
          </h1>
          <p className="text-slate-400 mt-1">
            Manage your account, security, and scraper preferences
          </p>
        </div>

        {/* Feedback banners */}
        {successMsg && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-slate-900/60 border border-slate-800 rounded-xl mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200",
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="glass-card rounded-xl p-8 border border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-600/10 rounded-lg text-blue-400">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Account Profile</h2>
            </div>

            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="font-semibold text-slate-200">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                    <Shield className="w-3 h-3" />
                    {user?.role || "user"}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full px-4 py-3 rounded-lg glass-input text-sm opacity-60 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-600 mt-1.5">Email cannot be changed.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Account Created
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                    className="w-full px-4 py-3 rounded-lg glass-input text-sm opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-900">
                <div className="text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Role</p>
                  <p className="text-sm font-bold mt-1 text-slate-200 capitalize">{user?.role || "user"}</p>
                </div>
                <div className="text-center border-x border-slate-800">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Status</p>
                  <p className="text-sm font-bold mt-1 text-green-400">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Plan</p>
                  <p className="text-sm font-bold mt-1 text-blue-400">Self-Hosted</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="glass-card rounded-xl p-8 border border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-600/10 rounded-lg text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Security & Password</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passwords.current}
                  onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg glass-input text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={passwords.new}
                    onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg glass-input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg glass-input text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handlePasswordSave}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 font-semibold rounded-lg text-sm transition-all border border-blue-500/30"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update Password
              </button>
            </div>

            {/* Security Notes */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <h3 className="text-sm font-bold mb-4 text-slate-300">Security Notes</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  Passwords are hashed with bcrypt before storage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  JWT tokens expire after 24 hours
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  All API requests require authentication
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Scraper Config Tab */}
        {activeTab === "scraper" && (
          <div className="glass-card rounded-xl p-8 border border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-600/10 rounded-lg text-indigo-400">
                <Sliders className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Scraper Configuration</h2>
            </div>

            <div className="space-y-6">
              {/* Delay settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Min Delay (seconds)
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={scraperConfig.delay_min}
                      onChange={(e) =>
                        setScraperConfig((c) => ({ ...c, delay_min: parseInt(e.target.value) || 1 }))
                      }
                      className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Max Delay (seconds)
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={scraperConfig.delay_max}
                      onChange={(e) =>
                        setScraperConfig((c) => ({ ...c, delay_max: parseInt(e.target.value) || 5 }))
                      }
                      className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Page Timeout (seconds)
                </label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={scraperConfig.timeout}
                  onChange={(e) =>
                    setScraperConfig((c) => ({ ...c, timeout: parseInt(e.target.value) || 30 }))
                  }
                  className="w-full px-4 py-3 rounded-lg glass-input text-sm"
                />
              </div>

              {/* Toggle options */}
              <div className="space-y-4">
                {[
                  { key: "headless", label: "Headless Mode (recommended for production)", desc: "Run browser without a visible UI window." },
                  { key: "screenshot_on_error", label: "Capture Screenshots on Error", desc: "Take a browser screenshot when a URL fails to scrape." },
                ].map((option) => (
                  <div
                    key={option.key}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-900/40 border border-slate-900 cursor-pointer hover:border-slate-800 transition-colors"
                    onClick={() =>
                      setScraperConfig((c) => ({
                        ...c,
                        [option.key]: !c[option.key as keyof typeof c],
                      }))
                    }
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{option.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{option.desc}</p>
                    </div>
                    <div
                      className={clsx(
                        "w-11 h-6 rounded-full transition-colors relative flex-shrink-0",
                        scraperConfig[option.key as keyof typeof scraperConfig]
                          ? "bg-blue-600"
                          : "bg-slate-700"
                      )}
                    >
                      <div
                        className={clsx(
                          "w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200",
                          scraperConfig[option.key as keyof typeof scraperConfig] ? "left-6" : "left-1"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleScraperSave}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 font-semibold rounded-lg text-sm transition-all border border-blue-500/30"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                Save Scraper Config
              </button>

              <p className="text-xs text-slate-600 mt-2">
                Note: These are UI-level preferences. For production config changes, update your <code className="text-slate-500">.env</code> file and restart the worker container.
              </p>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="glass-card rounded-xl p-8 border border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-teal-600/10 rounded-lg text-teal-400">
                <Bell className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Notification Preferences</h2>
            </div>

            <div className="space-y-4">
              {[
                { label: "Job Completed", desc: "Notify when a scraping job finishes successfully.", enabled: true },
                { label: "Job Failed", desc: "Alert when a job encounters critical errors.", enabled: true },
                { label: "Export Ready", desc: "Notify when a CSV/Excel export has been generated.", enabled: false },
                { label: "Weekly Summary", desc: "Weekly digest of your scraping activity.", enabled: false },
              ].map((notif, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-900/40 border border-slate-900 hover:border-slate-800 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{notif.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{notif.desc}</p>
                  </div>
                  <div
                    className={clsx(
                      "px-3 py-1 rounded-full text-xs font-semibold",
                      notif.enabled
                        ? "bg-green-600/10 text-green-400 border border-green-500/20"
                        : "bg-slate-800 text-slate-500 border border-slate-700"
                    )}
                  >
                    {notif.enabled ? "Enabled" : "Disabled"}
                  </div>
                </div>
              ))}

              <p className="text-xs text-slate-600 mt-4">
                Email notifications require SMTP configuration. See README for setup instructions.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

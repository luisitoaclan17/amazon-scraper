"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import { 
  Play, 
  History, 
  Database, 
  DownloadCloud, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid 
} from "recharts";
import { clsx } from "clsx";

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery<any>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/stats"),
    refetchInterval: 10000, // Refresh stats every 10s for real-time vibe
  });

  // Loading Skeleton Component
  const MetricSkeleton = () => (
    <div className="glass-card rounded-xl p-6 border border-slate-800/80 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-4 w-24 bg-slate-800 rounded" />
        <div className="w-8 h-8 bg-slate-800 rounded-lg" />
      </div>
      <div className="h-8 w-16 bg-slate-800 rounded mb-2" />
      <div className="h-3 w-32 bg-slate-800 rounded" />
    </div>
  );

  // Convert recent jobs data to chart data format
  const chartData = React.useMemo(() => {
    if (!stats?.recent_jobs) return [];
    return [...stats.recent_jobs]
      .reverse() // Chronological order
      .map((job: any) => ({
        name: `Job #${job.id}`,
        products: job.completed_count,
        failed: job.failed_count,
      }));
  }, [stats]);

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              SaaS Analytics
            </h1>
            <p className="text-slate-400 mt-1">
              Overview of your automated Amazon collection operations
            </p>
          </div>
          <Link
            href="/scraper"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold rounded-lg text-sm transition-all duration-200 border border-blue-500/30 shadow-lg shadow-blue-500/10"
          >
            <Play className="w-4 h-4 fill-white" />
            Launch Scraper
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            Failed to load metrics. Please check connection to backend.
          </div>
        )}

        {/* Metric Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => <MetricSkeleton key={i} />)
          ) : (
            <>
              {/* Total Jobs */}
              <div className="glass-card glass-card-hover rounded-xl p-6 border border-slate-800">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Jobs</span>
                  <div className="p-2 bg-slate-800/80 rounded-lg text-slate-400">
                    <History className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold">{stats?.total_jobs}</h3>
                <p className="text-xs text-slate-500 mt-2">Scraping queues launched</p>
              </div>

              {/* Products Scraped */}
              <div className="glass-card glass-card-hover rounded-xl p-6 border border-slate-800">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Products</span>
                  <div className="p-2 bg-blue-600/10 rounded-lg text-blue-400">
                    <Database className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-blue-400">{stats?.products_scraped}</h3>
                <p className="text-xs text-slate-500 mt-2">Saved database records</p>
              </div>

              {/* CSV Downloads */}
              <div className="glass-card glass-card-hover rounded-xl p-6 border border-slate-800">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Downloads</span>
                  <div className="p-2 bg-green-600/10 rounded-lg text-green-400">
                    <DownloadCloud className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-green-400">{stats?.csv_downloads}</h3>
                <p className="text-xs text-slate-500 mt-2">Generated spreadsheet exports</p>
              </div>

              {/* Running Jobs */}
              <div className="glass-card glass-card-hover rounded-xl p-6 border border-slate-800">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Jobs</span>
                  <div className={clsx(
                    "p-2 rounded-lg",
                    stats?.running_jobs > 0 
                      ? "bg-amber-600/10 text-amber-400 animate-pulse" 
                      : "bg-slate-800/80 text-slate-400"
                  )}>
                    <Play className={clsx("w-5 h-5", stats?.running_jobs > 0 && "fill-amber-400")} />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-amber-400">{stats?.running_jobs}</h3>
                <p className="text-xs text-slate-500 mt-2">Active scraper threads</p>
              </div>

              {/* Failed Jobs */}
              <div className="glass-card glass-card-hover rounded-xl p-6 border border-slate-800">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed Jobs</span>
                  <div className="p-2 bg-red-600/10 rounded-lg text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-red-400">{stats?.failed_jobs}</h3>
                <p className="text-xs text-slate-500 mt-2">Failed scraping queues</p>
              </div>
            </>
          )}
        </section>

        {/* Charts & Activity Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Card */}
          <div className="glass-card rounded-xl p-6 border border-slate-800 lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold">Scraping Performance</h2>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                Success rate and product counts processed across your recent scraping runs
              </p>
            </div>
            
            <div className="h-72 w-full">
              {isLoading ? (
                <div className="w-full h-full bg-slate-900/40 rounded-lg animate-pulse" />
              ) : chartData.length === 0 ? (
                <div className="w-full h-full bg-slate-900/20 rounded-lg flex items-center justify-center text-slate-500 text-sm">
                  Run your first scraper job to generate chart data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: 8, color: "white" }} 
                      labelStyle={{ fontWeight: "bold" }}
                    />
                    <Area type="monotone" dataKey="products" name="Scraped Products" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorProd)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Activity Feed Card */}
          <div className="glass-card rounded-xl p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold">Recent Activity</h2>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 bg-slate-800 rounded-full" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-slate-800 rounded w-3/4" />
                        <div className="h-3 bg-slate-800 rounded w-1/4" />
                      </div>
                    </div>
                  ))
                ) : stats?.recent_activity.map((activity: any) => {
                  return (
                    <div key={activity.id} className="flex gap-3 text-sm">
                      <div className="mt-0.5">
                        {activity.type === "job_completed" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {activity.type === "job_failed" && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        {activity.type === "job_started" && <Clock className="w-4 h-4 text-blue-500" />}
                        {activity.type === "export_downloaded" && <DownloadCloud className="w-4 h-4 text-teal-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 break-words line-clamp-2">{activity.message}</p>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              href="/history"
              className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:gap-3 transition-all pt-4 border-t border-slate-800/60"
            >
              View Full History
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

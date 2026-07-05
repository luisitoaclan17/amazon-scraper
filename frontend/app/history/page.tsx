"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import { 
  DownloadCloud, 
  Trash2, 
  RefreshCw, 
  Terminal, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from "lucide-react";
import { clsx } from "clsx";

export default function HistoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [jobLogs, setJobLogs] = useState<string[]>([]);

  // 1. Fetch previous jobs
  const { data: jobs = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["jobs-history"],
    queryFn: () => api.get("/jobs"),
  });

  // 2. Delete Job Mutation
  const deleteMutation = useMutation({
    mutationFn: (jobId: number) => api.delete(`/jobs/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs-history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    }
  });

  // 3. Retry Mutation
  const retryMutation = useMutation({
    mutationFn: (jobId: number) => api.post<any>(`/jobs/${jobId}/retry`),
    onSuccess: (newJob) => {
      // Redirect to scraper and trigger active polling by setting local state or let router carry state
      // We will save activeJobId in sessionStorage for the scraper page to pick up automatically!
      if (typeof window !== "undefined") {
        sessionStorage.setItem("activeJobId", String(newJob.id));
      }
      router.push("/scraper");
    }
  });

  const handleDeleteJob = async (jobId: number) => {
    if (confirm(`Are you sure you want to delete Job #${jobId} and all its products?`)) {
      deleteMutation.mutate(jobId);
    }
  };

  const handleRetryJob = (jobId: number) => {
    retryMutation.mutate(jobId);
  };

  const toggleExpandJob = async (jobId: number) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      setJobLogs([]);
      return;
    }

    setExpandedJobId(jobId);
    setLogsLoading(true);
    try {
      const logs = await api.get<string[]>(`/jobs/${jobId}/logs`);
      setJobLogs(logs);
    } catch (err) {
      setJobLogs(["Failed to load logs for this job."]);
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Jobs History
          </h1>
          <p className="text-slate-400 mt-1">
            Review previous runs, audit logs, and retrieve CSV exports
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            Failed to fetch job history list. Make sure database container is online.
          </div>
        )}

        {/* Jobs List Panel */}
        {isLoading ? (
          <div className="glass-card rounded-xl border border-slate-800 p-8 space-y-4 animate-pulse">
            <div className="h-6 bg-slate-900 rounded w-1/4" />
            <div className="h-10 bg-slate-900 rounded" />
            <div className="h-10 bg-slate-900 rounded" />
            <div className="h-10 bg-slate-900 rounded" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-xl border border-slate-800">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold">No jobs logged yet</h3>
            <p className="text-slate-500 text-sm mt-1">Go to Amazon Scraper to queue your first list of links.</p>
          </div>
        ) : (
          <section className="space-y-4">
            {jobs.map((job) => {
              const isExpanded = expandedJobId === job.id;
              const hasProducts = job.completed_count > 0;
              const hasFailures = job.failed_count > 0;
              const successPercent = job.total_urls 
                ? Math.round((job.completed_count / job.total_urls) * 100) 
                : 0;

              return (
                <div 
                  key={job.id} 
                  className={clsx(
                    "glass-card rounded-xl border transition-all duration-200 overflow-hidden",
                    isExpanded ? "border-slate-700 bg-slate-900/10" : "border-slate-800/80 hover:border-slate-700/60"
                  )}
                >
                  {/* Row summary info */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Identification & Date */}
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-900/80 rounded-lg text-slate-400 font-mono text-xs font-bold border border-slate-800">
                        #{job.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-200">Amazon Batch Scrape</h3>
                          <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            job.status === "completed" && "bg-green-600/15 text-green-400 border border-green-500/20",
                            job.status === "failed" && "bg-red-600/15 text-red-400 border border-red-500/20",
                            job.status === "running" && "bg-amber-600/15 text-amber-400 border border-amber-500/20 animate-pulse",
                            job.status === "queued" && "bg-blue-600/15 text-blue-400 border border-blue-500/20",
                            job.status === "cancelled" && "bg-slate-800 text-slate-400 border border-slate-700"
                          )}>
                            {job.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(job.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Stats & Progress */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 uppercase font-semibold">Success Ratio</span>
                        <p className="font-bold text-slate-200 mt-0.5">
                          {successPercent}% ({job.completed_count}/{job.total_urls})
                        </p>
                      </div>
                      
                      {hasFailures && (
                        <div className="text-right hidden sm:block">
                          <span className="text-xs text-slate-500 uppercase font-semibold">Failed</span>
                          <p className="font-bold text-red-400 mt-0.5 flex items-center gap-1 justify-end">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {job.failed_count}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center gap-2">
                      {/* Show Logs Toggle */}
                      <button
                        onClick={() => toggleExpandJob(job.id)}
                        className="p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
                        title="Show Logs"
                      >
                        <Terminal className="w-4 h-4" />
                      </button>

                      {/* Download CSV */}
                      <button
                        onClick={() => {
                          if (!hasProducts) return;
                          const url = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api") + `/export/${job.id}?format=csv`;
                          const token = localStorage.getItem("token");
                          fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                            .then(r => r.blob())
                            .then(blob => {
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(blob);
                              a.download = `amazon_job${job.id}.csv`;
                              a.click();
                            });
                        }}
                        disabled={!hasProducts}
                        className={clsx(
                          "p-2 rounded border transition-colors flex items-center justify-center",
                          hasProducts 
                            ? "bg-blue-600/10 hover:bg-blue-600/25 border-blue-500/20 text-blue-400 hover:text-blue-300" 
                            : "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                        )}
                        title="Download CSV"
                      >
                        <DownloadCloud className="w-4 h-4" />
                      </button>

                      {/* Download Excel */}
                      <button
                        onClick={() => {
                          if (!hasProducts) return;
                          const url = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api") + `/export/${job.id}?format=excel`;
                          const token = localStorage.getItem("token");
                          fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                            .then(r => r.blob())
                            .then(blob => {
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(blob);
                              a.download = `amazon_job${job.id}.xlsx`;
                              a.click();
                            });
                        }}
                        disabled={!hasProducts}
                        className={clsx(
                          "p-2 rounded border transition-colors flex items-center justify-center",
                          hasProducts 
                            ? "bg-green-600/10 hover:bg-green-600/25 border-green-500/20 text-green-400 hover:text-green-300" 
                            : "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                        )}
                        title="Download Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>

                      {/* Retry Failed */}
                      <button
                        onClick={() => handleRetryJob(job.id)}
                        disabled={!hasFailures || retryMutation.isPending}
                        className={clsx(
                          "p-2 rounded border transition-colors flex items-center justify-center",
                          hasFailures 
                            ? "bg-amber-600/10 hover:bg-amber-600/25 border-amber-500/20 text-amber-400 hover:text-amber-300" 
                            : "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                        )}
                        title="Retry Failed Links"
                      >
                        {retryMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>

                      {/* Delete Job */}
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 rounded bg-red-600/15 hover:bg-red-600/25 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                        title="Delete Job Records"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Log details */}
                  {isExpanded && (
                    <div className="border-t border-slate-900 bg-slate-950 p-4 font-mono text-[11px] text-slate-300 max-h-60 overflow-y-auto console-scrollbar">
                      {logsLoading ? (
                        <div className="flex items-center gap-2 text-slate-500 italic">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Reading log files...
                        </div>
                      ) : jobLogs.length === 0 ? (
                        <div className="text-slate-600 italic">No logs recorded for this job.</div>
                      ) : (
                        jobLogs.map((log, index) => (
                          <div key={index} className="leading-relaxed pl-2 border-l border-slate-800">
                            <span className="text-slate-600 mr-2">[{index + 1}]</span>
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

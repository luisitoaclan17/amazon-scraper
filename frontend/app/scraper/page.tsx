"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { 
  Play, 
  Pause, 
  UploadCloud, 
  Loader2, 
  Trash2, 
  DownloadCloud, 
  CheckCircle,
  AlertCircle,
  Clock,
  Terminal,
  RefreshCw
} from "lucide-react";
import { clsx } from "clsx";

export default function ScraperPage() {
  const [urlInput, setUrlInput] = useState("");
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Active job tracking
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [jobLogs, setJobLogs] = useState<string[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  
  // Timer references
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll console logger to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [jobLogs]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const startPolling = (jobId: number) => {
    stopPolling();
    
    // Elapsed time counter
    setElapsedTime(0);
    elapsedTimerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    // Details and log poller
    const poll = async () => {
      try {
        const details = await api.get<any>(`/jobs/${jobId}`);
        setJobDetails(details);

        const logs = await api.get<any>(`/jobs/${jobId}/logs`);
        setJobLogs(logs);

        // Stop polling if complete, failed, or cancelled
        if (["completed", "failed", "cancelled"].includes(details.status)) {
          stopPolling();
        }
      } catch (err) {
        // Log query errors silently or show message
      }
    };

    poll(); // Initial run
    pollTimerRef.current = setInterval(poll, 2500);
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  };

  // Parse Manual URLs
  const handleAddManualUrls = () => {
    setErrorMsg(null);
    if (!urlInput.trim()) return;
    
    const lines = urlInput.split(/[\n,]/);
    const validLines = lines
      .map((l) => l.trim())
      .filter((l) => l.startsWith("http"));
      
    if (validLines.length === 0) {
      setErrorMsg("Please enter valid HTTP URLs (one per line).");
      return;
    }
    
    setPreviewUrls((prev) => Array.from(new Set([...prev, ...validLines])));
    setUrlInput("");
  };

  // Parse File Uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const extractedUrls = await api.post<string[]>("/upload", formData);
      setPreviewUrls((prev) => Array.from(new Set([...prev, ...extractedUrls])));
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.detail);
      } else {
        setErrorMsg("Failed to parse file. Make sure it is CSV or TXT.");
      }
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Launch Scraping Job
  const handleStartScraping = async () => {
    setErrorMsg(null);
    if (previewUrls.length === 0) {
      setErrorMsg("No product URLs ready to scrape.");
      return;
    }

    try {
      const job = await api.post<any>("/jobs", { urls: previewUrls });
      setActiveJobId(job.id);
      setJobDetails(job);
      setJobLogs(["Initializing scraper queue..."]);
      setPreviewUrls([]);
      startPolling(job.id);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.detail);
      } else {
        setErrorMsg("Failed to start job. Connection error.");
      }
    }
  };

  // Cancel Active Job
  const handleCancelScraping = async () => {
    if (!activeJobId) return;
    try {
      await api.post(`/jobs/${activeJobId}/cancel`);
      setJobLogs((prev) => [...prev, "Cancellation requested by user..."]);
    } catch (err) {
      //
    }
  };

  // Clear Preview List
  const handleClearPreview = () => {
    setPreviewUrls([]);
  };

  // Calculations for estimates
  const totalProcessed = (jobDetails?.completed_count || 0) + (jobDetails?.failed_count || 0);
  const progressPercent = jobDetails?.total_urls 
    ? Math.round((totalProcessed / jobDetails.total_urls) * 100) 
    : 0;

  const getRemainingTime = () => {
    if (!jobDetails || jobDetails.status !== "running" || totalProcessed === 0) {
      return "Calculating...";
    }
    const avgTime = elapsedTime / totalProcessed;
    const remaining = jobDetails.total_urls - totalProcessed;
    const seconds = Math.round(remaining * avgTime);
    
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getFormattedTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Amazon Product Scraper
          </h1>
          <p className="text-slate-400 mt-1">
            Upload public product endpoints and monitor data collection jobs
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Dynamic content depending on active job state */}
        {!activeJobId ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input & Upload Controls */}
            <div className="space-y-6">
              {/* Textarea Paste */}
              <div className="glass-card rounded-xl p-6 border border-slate-800">
                <h2 className="text-lg font-bold mb-4">Paste Product URLs</h2>
                <textarea
                  placeholder="https://www.amazon.com/dp/B08N5WRWNW&#10;https://www.amazon.co.uk/dp/B081FV1Y57"
                  rows={6}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full p-4 rounded-lg glass-input text-sm font-mono resize-none mb-4 placeholder-slate-600"
                />
                <button
                  onClick={handleAddManualUrls}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 font-semibold rounded-lg text-sm transition-colors border border-slate-700"
                >
                  Verify and Add URLs
                </button>
              </div>

              {/* File Upload Drag-and-Drop */}
              <div className="glass-card rounded-xl p-6 border border-slate-800">
                <h2 className="text-lg font-bold mb-4">Upload Spreadsheet</h2>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-900/10 hover:bg-blue-500/5"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv,.txt"
                    className="hidden"
                  />
                  {uploadLoading ? (
                    <>
                      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                      <p className="text-sm font-medium">Extracting list values...</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-10 h-10 text-slate-500 mb-4" />
                      <p className="text-sm font-semibold mb-1">Click to select files</p>
                      <p className="text-xs text-slate-500">Supports CSV containing 'url' column or TXT files</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Verification & Launch Preview */}
            <div className="glass-card rounded-xl p-6 border border-slate-800 flex flex-col justify-between min-h-[400px]">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold">URLs Queue Preview</h2>
                    <p className="text-xs text-slate-500 mt-0.5">URLs normalized and formatted for collection</p>
                  </div>
                  {previewUrls.length > 0 && (
                    <button
                      onClick={handleClearPreview}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 border border-slate-900 rounded-lg p-2 bg-slate-950/20">
                  {previewUrls.length === 0 ? (
                    <div className="py-16 text-center text-slate-600 text-sm">
                      Pasted URLs or uploaded spreadsheet rows appear here.
                    </div>
                  ) : (
                    previewUrls.map((url, i) => (
                      <div key={i} className="text-xs font-mono p-2 rounded bg-slate-900/60 border border-slate-800/40 truncate text-slate-300">
                        {url}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-sm text-slate-400 mb-4">
                  <span>Batch Queue Total:</span>
                  <span className="font-semibold text-white">{previewUrls.length} links</span>
                </div>

                <button
                  onClick={handleStartScraping}
                  disabled={previewUrls.length === 0}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800/50 disabled:text-slate-500 text-white font-bold rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 border border-blue-500/20 shadow-lg shadow-blue-500/10"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Launch Scraper Job
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Job Monitoring Dashboard */
          <div className="space-y-8 animate-fade-in">
            {/* Scraper Progress Header */}
            <div className="glass-card rounded-xl p-6 border border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">Job #{activeJobId} Progress</h2>
                    <span className={clsx(
                      "px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
                      jobDetails?.status === "running" && "bg-amber-600/10 text-amber-400 border border-amber-500/20",
                      jobDetails?.status === "queued" && "bg-blue-600/10 text-blue-400 border border-blue-500/20",
                      jobDetails?.status === "completed" && "bg-green-600/10 text-green-400 border border-green-500/20",
                      jobDetails?.status === "failed" && "bg-red-600/10 text-red-400 border border-red-500/20",
                      jobDetails?.status === "cancelled" && "bg-slate-800 text-slate-400 border border-slate-700"
                    )}>
                      {jobDetails?.status || "Processing..."}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Scraping items from Amazon networks
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {["queued", "running"].includes(jobDetails?.status) && (
                    <button
                      onClick={handleCancelScraping}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 font-semibold rounded-lg text-xs transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5 fill-red-400" />
                      Stop Scraper
                    </button>
                  )}
                  {["completed", "failed", "cancelled"].includes(jobDetails?.status) && (
                    <>
                      {jobDetails.completed_count > 0 && (
                        <a
                          href={`/api/export/${activeJobId}?format=csv`}
                          onClick={(e) => {
                            e.preventDefault();
                            const url = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api") + `/export/${activeJobId}?format=csv`;
                            const token = localStorage.getItem("token");
                            fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                              .then(r => r.blob())
                              .then(blob => {
                                const a = document.createElement("a");
                                a.href = URL.createObjectURL(blob);
                                a.download = `amazon_products_job${activeJobId}.csv`;
                                a.click();
                              });
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-500/20 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          <DownloadCloud className="w-4 h-4" />
                          Download CSV
                        </a>
                      )}
                      <button
                        onClick={() => setActiveJobId(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 font-semibold rounded-lg text-xs transition-colors border border-slate-700"
                      >
                        Start New Job
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-slate-400">Total Scraped Progress</span>
                  <span>{progressPercent}% ({totalProcessed}/{jobDetails?.total_urls || 0} links)</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800/80">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out shadow-lg shadow-blue-500/20"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Details Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/40 border border-slate-900">
                <div className="text-center md:border-r md:border-slate-900/60 py-2">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Succeeded</span>
                  <p className="text-xl font-bold text-green-400 mt-1 flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    {jobDetails?.completed_count || 0}
                  </p>
                </div>
                <div className="text-center md:border-r md:border-slate-900/60 py-2">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Failed</span>
                  <p className="text-xl font-bold text-red-400 mt-1 flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    {jobDetails?.failed_count || 0}
                  </p>
                </div>
                <div className="text-center md:border-r md:border-slate-900/60 py-2">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Elapsed Time</span>
                  <p className="text-xl font-bold mt-1 flex items-center justify-center gap-1.5 text-slate-300">
                    <Clock className="w-4 h-4" />
                    {getFormattedTime(elapsedTime)}
                  </p>
                </div>
                <div className="text-center py-2">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Estimated Left</span>
                  <p className="text-xl font-bold mt-1 flex items-center justify-center gap-1.5 text-slate-300">
                    <RefreshCw className={clsx("w-4 h-4", jobDetails?.status === "running" && "animate-spin")} style={{ animationDuration: '3s' }} />
                    {getRemainingTime()}
                  </p>
                </div>
              </div>
            </div>

            {/* Live Terminal Logger */}
            <div className="glass-card rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold font-mono tracking-wider text-slate-300">Live Scraper Logs Console</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
              </div>
              <div className="p-5 bg-slate-950 font-mono text-xs text-slate-300 h-80 overflow-y-auto space-y-1.5 console-scrollbar">
                {jobLogs.length === 0 ? (
                  <div className="text-slate-600 italic">Tailing logging channel...</div>
                ) : (
                  jobLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed border-l-2 border-blue-500/20 pl-2">
                      <span className="text-slate-600 mr-2">[{index + 1}]</span>
                      <span>{log}</span>
                    </div>
                  ))
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

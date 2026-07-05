const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  // 1. Build Headers
  const headers = new Headers(options.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // 2. Build URL Query Params
  let url = `${API_BASE}${path}`;
  if (options.params) {
    const cleanParams = Object.entries(options.params)
      .filter(([_, v]) => v !== undefined && v !== null)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {} as Record<string, string>);
      
    const searchParams = new URLSearchParams(cleanParams);
    url += `?${searchParams.toString()}`;
  }

  // 3. Make Fetch Request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 4. Handle Unauthorized — redirect to login
  if (response.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
    if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Session expired. Please login again.");
  }

  // 5. Handle Empty Response (204 No Content)
  if (response.status === 204) {
    return null as unknown as T;
  }

  // 6. Handle Errors
  if (!response.ok) {
    let detail = "An unexpected error occurred.";
    try {
      const errData = await response.json();
      detail = errData.detail || detail;
    } catch {
      // JSON parse failed — use status text
      detail = response.statusText || detail;
    }
    throw new ApiError(response.status, detail);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => 
    request<T>(path, { ...options, method: "GET" }),
    
  post: <T>(path: string, body?: any, options?: RequestOptions) => 
    request<T>(path, { 
      ...options, 
      method: "POST", 
      body: body instanceof FormData ? body : 
            body instanceof URLSearchParams ? body.toString() :
            JSON.stringify(body) 
    }),
    
  put: <T>(path: string, body?: any, options?: RequestOptions) => 
    request<T>(path, { 
      ...options, 
      method: "PUT", 
      body: body ? JSON.stringify(body) : undefined
    }),
    
  delete: <T>(path: string, options?: RequestOptions) => 
    request<T>(path, { ...options, method: "DELETE" }),

  /** Build a direct download URL with auth token for anchor tags */
  downloadUrl: (path: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    return `${API_BASE}${path}?token=${token}`;
  }
};

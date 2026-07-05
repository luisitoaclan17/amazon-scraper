"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import { 
  Search, 
  Filter, 
  Grid, 
  Table, 
  Star, 
  Check, 
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import { clsx } from "clsx";

export default function ProductsPage() {
  // Query States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [minRating, setMinRating] = useState<number | "">("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [inStockOnly, setInStockOnly] = useState<boolean | "">("");
  
  // Page states
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 12;

  // Build params
  const queryParams = {
    search: searchTerm || undefined,
    brand: selectedBrand || undefined,
    category: selectedCategory || undefined,
    rating_min: minRating !== "" ? minRating : undefined,
    price_min: minPrice !== "" ? minPrice : undefined,
    price_max: maxPrice !== "" ? maxPrice : undefined,
    availability: inStockOnly !== "" ? inStockOnly : undefined,
    skip: currentPage * itemsPerPage,
    limit: itemsPerPage,
  };

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["products-list", queryParams],
    queryFn: () => api.get("/products", { params: queryParams }),
    placeholderData: (previousData: unknown) => previousData, // keep old data during transitions
  });

  const products = data?.items || [];
  const filtersData = data?.filters || { brands: [], categories: [] };
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedBrand("");
    setSelectedCategory("");
    setMinRating("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly("");
    setCurrentPage(0);
  };

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Scraped Products
            </h1>
            <p className="text-slate-400 mt-1">
              Explore, filter, and preview collected Amazon items
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={clsx(
                "p-2 rounded-md transition-colors",
                viewMode === "grid" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={clsx(
                "p-2 rounded-md transition-colors",
                viewMode === "table" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar Panel */}
        <section className="glass-card rounded-xl p-6 border border-slate-800 mb-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="relative col-span-1 md:col-span-2">
              <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by title, brand, category, ASIN..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-sm"
              />
            </div>

            {/* Brand Dropdown */}
            <div>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full px-3 py-2.5 rounded-lg glass-input text-sm"
              >
                <option value="">All Brands</option>
                {filtersData.brands.map((b: string) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Category Dropdown */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full px-3 py-2.5 rounded-lg glass-input text-sm"
              >
                <option value="">All Categories</option>
                {filtersData.categories.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-900">
            <div className="flex flex-wrap items-center gap-4">
              {/* Min Rating */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">Min Stars:</span>
                <select
                  value={minRating}
                  onChange={(e) => {
                    setMinRating(e.target.value ? Number(e.target.value) : "");
                    setCurrentPage(0);
                  }}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white"
                >
                  <option value="">Any</option>
                  <option value="4.5">4.5+ ★</option>
                  <option value="4">4.0+ ★</option>
                  <option value="3.5">3.5+ ★</option>
                  <option value="3">3.0+ ★</option>
                </select>
              </div>

              {/* Price Min/Max */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">Price range:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value ? Number(e.target.value) : "");
                    setCurrentPage(0);
                  }}
                  className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600"
                />
                <span className="text-slate-600 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value ? Number(e.target.value) : "");
                    setCurrentPage(0);
                  }}
                  className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600"
                />
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">Stock:</span>
                <select
                  value={inStockOnly === "" ? "" : String(inStockOnly)}
                  onChange={(e) => {
                    setInStockOnly(e.target.value === "true" ? true : e.target.value === "false" ? false : "");
                    setCurrentPage(0);
                  }}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white"
                >
                  <option value="">All</option>
                  <option value="true">In Stock</option>
                  <option value="false">Out of Stock</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleResetFilters}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              Reset Filters
            </button>
          </div>
        </section>

        {/* Query status logs */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm mb-6">
            Failed to query product records. Make sure the database is up.
          </div>
        )}

        {/* Main Grid View */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="glass-card rounded-xl border border-slate-850 h-80 flex flex-col justify-between p-4">
                <div className="w-full h-40 bg-slate-900 rounded-lg mb-4" />
                <div className="h-4 bg-slate-900 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-900 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 glass-card rounded-xl border border-slate-800">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold">No products found</h3>
            <p className="text-slate-500 text-sm mt-1">Try loosening search words or launch a scraper job.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((prod: any) => (
              <article key={prod.id} className="glass-card glass-card-hover rounded-xl border border-slate-850 overflow-hidden flex flex-col justify-between">
                {/* Image panel */}
                <div className="h-48 w-full bg-white relative p-4 flex items-center justify-center border-b border-slate-900">
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={prod.title || "product"}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <ShoppingBag className="w-10 h-10 text-slate-300" />
                  )}
                  {prod.prime && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-[10px] font-bold uppercase rounded text-white tracking-wider">
                      Prime
                    </span>
                  )}
                  {!prod.availability && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-slate-800 text-[10px] font-bold uppercase rounded text-slate-400 border border-slate-700 tracking-wider">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Details panel */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block">
                      {prod.brand || "Generic Brand"}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-200 line-clamp-2 hover:line-clamp-none transition-all" title={prod.title}>
                      {prod.title}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {/* Price and discount */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-extrabold text-white">
                        {prod.price ? `${prod.currency === 'USD' ? '$' : prod.currency + ' '}${prod.price.toFixed(2)}` : "Unavailable"}
                      </span>
                      {prod.original_price && prod.original_price > (prod.price || 0) && (
                        <>
                          <span className="text-xs text-slate-500 line-through">
                            {prod.currency === 'USD' ? '$' : prod.currency + ' '}{prod.original_price.toFixed(2)}
                          </span>
                          <span className="text-xs font-semibold text-red-400 flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" />
                            {prod.discount}%
                          </span>
                        </>
                      )}
                    </div>

                    {/* Ratings */}
                    <div className="flex items-center justify-between text-xs border-t border-slate-900 pt-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-slate-300">{prod.rating || "N/A"}</span>
                        <span className="text-slate-500">({prod.review_count})</span>
                      </div>

                      <a
                        href={prod.product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          /* Table Spreadsheet Mode */
          <div className="glass-card rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/30 text-xs uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-5 py-4">ASIN</th>
                  <th className="px-5 py-4 w-1/3">Title</th>
                  <th className="px-5 py-4">Brand</th>
                  <th className="px-5 py-4">Price</th>
                  <th className="px-5 py-4">Stars</th>
                  <th className="px-5 py-4">Reviews</th>
                  <th className="px-5 py-4">Stock</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-xs">
                {products.map((prod: any) => (
                  <tr key={prod.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-blue-400">{prod.asin}</td>
                    <td className="px-5 py-3 font-medium text-slate-200 max-w-[200px] truncate" title={prod.title}>{prod.title}</td>
                    <td className="px-5 py-3 text-slate-400">{prod.brand || "—"}</td>
                    <td className="px-5 py-3 text-white font-bold">
                      {prod.price ? `${prod.currency === 'USD' ? '$' : prod.currency + ' '}${prod.price.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{prod.rating || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{prod.review_count}</td>
                    <td className="px-5 py-3">
                      {prod.availability ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <Check className="w-3.5 h-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500">
                          <X className="w-3.5 h-3.5" /> No
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={prod.product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Amazon <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <section className="flex justify-between items-center mt-8">
            <span className="text-xs text-slate-500">
              Showing {currentPage * itemsPerPage + 1}–{Math.min((currentPage + 1) * itemsPerPage, totalItems)} of {totalItems} items
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors border border-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 font-semibold px-2">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors border border-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

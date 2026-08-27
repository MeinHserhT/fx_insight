'use client';

import React from 'react';

export function SkeletonLoader() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Top Hero Card Skeleton */}
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="h-4 bg-slate-100 rounded w-36" />
        <div className="flex flex-wrap items-baseline gap-4">
          <div className="h-12 bg-slate-100 rounded-xl w-64" />
          <div className="h-8 bg-slate-100 rounded-xl w-32" />
        </div>
        <div className="h-4 bg-slate-100 rounded w-48" />
      </div>

      {/* Grid of Chart + Converter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 h-96 shadow-sm">
          <div className="flex justify-between">
            <div className="h-5 bg-slate-100 rounded w-48" />
            <div className="h-8 bg-slate-100 rounded w-40" />
          </div>
          <div className="w-full h-64 bg-slate-50 rounded-xl" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 h-96 shadow-sm">
          <div className="h-5 bg-slate-100 rounded w-40" />
          <div className="h-20 bg-slate-50 rounded-xl" />
          <div className="h-20 bg-slate-50 rounded-xl" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 space-y-3 h-28 shadow-sm">
            <div className="h-3 bg-slate-100 rounded w-24" />
            <div className="h-6 bg-slate-100 rounded w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

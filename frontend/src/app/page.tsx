"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) {
      router.replace("/sites");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background text-muted">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center animate-pulse-glow">
          <span className="text-background font-extrabold text-xl">L</span>
        </div>
        <span className="text-xs">Redirecting...</span>
      </div>
    </div>
  );
}
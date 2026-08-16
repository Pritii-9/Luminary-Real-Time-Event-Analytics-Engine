"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login, register, getToken } from "@/lib/api";
import { Mail, Lock, Eye, EyeOff, User, Building2, ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Toast from "@/components/Toast";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Toggle between 'signin' and 'signup' modes
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");

  // UI interaction states
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validation & Toast states
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Sync mode from query param if available (?mode=signup)
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "signup" || modeParam === "register") {
      setMode("signup");
    } else {
      setMode("signin");
    }
  }, [searchParams]);

  // Handle redirect if already logged in
  useEffect(() => {
    if (getToken()) {
      router.push("/sites");
    }
  }, [router]);

  // Client-side real-time validations
  const validateEmail = (val: string) => {
    setEmail(val);
    if (!val) {
      setEmailError("Email address is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const validatePassword = (val: string) => {
    setPassword(val);
    if (!val) {
      setPasswordError("Password is required");
      return;
    }
    if (val.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
    } else {
      setPasswordError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    // Final checks
    if (!email) {
      setEmailError("Email is required");
      setToast({ message: "Please fill in all required fields", type: "error" });
      return;
    }
    if (!password) {
      setPasswordError("Password is required");
      setToast({ message: "Please fill in all required fields", type: "error" });
      return;
    }
    if (emailError || passwordError) {
      setToast({ message: "Please resolve the form validation errors first", type: "error" });
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await login(email, password);
        setToast({ message: "Authenticated successfully! Redirecting...", type: "success" });
        setTimeout(() => {
          router.push("/sites");
        }, 800);
      } else {
        // Sign up
        await register(email, password);
        setToast({ message: "Account created successfully! Redirecting...", type: "success" });
        setTimeout(() => {
          router.push("/sites");
        }, 800);
      }
    } catch (err: any) {
      setToast({ message: err.message || "An authentication error occurred.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden transition-colors duration-200">
      
      {/* Header theme toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center shadow-md mb-3 transition-colors duration-200">
            <span className="text-background font-extrabold text-xl tracking-tighter">L</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Luminary Analytics
          </h1>
          <p className="text-[10px] text-muted uppercase tracking-widest font-bold mt-1">
            Privacy-First Web Telemetry
          </p>
        </div>

        {/* Card Component */}
        <div className="rounded-2xl border border-card-border bg-card p-8 shadow-xl transition-all duration-200">
          
          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-xs text-muted mt-1">
              {mode === "signin" 
                ? "Enter your credentials to access the analytics workspace." 
                : "Get started with privacy-friendly web analytics in under a minute."}
            </p>
          </div>

          {/* Google Social Login */}
          <div className="mb-5">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-card-border bg-background/50 hover:bg-slate-100 dark:hover:bg-slate-800/40 px-4 py-2.5 text-xs font-bold text-foreground transition-all duration-200 cursor-pointer"
            >
              <svg className="h-4 w-4 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.65 4.5 1.8l2.4-2.4C17.3 1.7 14.9 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.9 0 9.8-4.13 9.8-9.98 0-.67-.06-1.3-.18-1.85h-9.66z" />
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Separator */}
          <div className="relative mb-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-card-border" />
            </div>
            <span className="relative bg-card px-3 text-[10px] uppercase tracking-wider font-semibold text-muted">
              Or continue with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Conditionally render Full Name / Company Name in signup mode */}
            {mode === "signup" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                <div>
                  <label htmlFor="fullName" className="block text-[10px] font-bold text-muted mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-card-border bg-background/50 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10"
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="companyName" className="block text-[10px] font-bold text-muted mb-1.5 uppercase tracking-wider">
                    Company Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <input
                      id="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-xl border border-card-border bg-background/50 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10"
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-muted mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => validateEmail(e.target.value)}
                  className={`w-full rounded-xl border bg-background/50 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:ring-1 ${
                    emailError
                      ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10"
                      : "border-card-border focus:border-accent focus:ring-accent/10"
                  }`}
                  placeholder="you@domain.com"
                />
              </div>
              {emailError && (
                <span className="text-[10px] text-red-500 dark:text-red-400 mt-1 block font-semibold">
                  {emailError}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[10px] font-bold text-muted uppercase tracking-wider">
                  Password
                </label>
                {mode === "signin" && (
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      setToast({ message: "Password reset is not configured for the local demo.", type: "error" });
                    }}
                    className="text-[10px] font-bold text-accent hover:text-accent-hover transition-colors"
                  >
                    Forgot Password?
                  </a>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => validatePassword(e.target.value)}
                  className={`w-full rounded-xl border bg-background/50 pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:ring-1 ${
                    passwordError
                      ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10"
                      : "border-card-border focus:border-accent focus:ring-accent/10"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-foreground transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <span className="text-[10px] text-red-500 dark:text-red-400 mt-1 block font-semibold">
                  {passwordError}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !!emailError || !!passwordError}
              className="w-full mt-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-background hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 shadow-md shadow-accent/5 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switch Trigger */}
          <p className="mt-6 text-center text-xs text-muted">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setEmailError("");
                setPasswordError("");
              }}
              className="text-accent hover:text-accent-hover font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
            >
              {mode === "signin" ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>

        {/* Local Demo Credentials Helper */}
        {mode === "signin" && (
          <div className="mt-4 rounded-xl border border-card-border bg-card/25 px-4 py-2.5 text-center transition-all duration-200">
            <p className="text-[10px] text-muted">
              Local sandbox login: <span className="text-foreground/80 font-mono">demo@luminary.dev</span> / <span className="text-foreground/80 font-mono">demo1234</span>
            </p>
          </div>
        )}
      </div>

      {/* Dynamic Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

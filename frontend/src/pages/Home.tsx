import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMe } from "@/lib/api";
import Logo from "@/components/Logo";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    getMe()
      .then(() => navigate("/sites"))
      .catch(() => navigate("/login"));
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-background text-muted">
      <div className="flex flex-col items-center gap-3">
        <Logo className="h-10 w-10 animate-pulse-glow" />
        <span className="text-xs">Redirecting...</span>
      </div>
    </div>
  );
}
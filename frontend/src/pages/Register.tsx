import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login?mode=signup");
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#0b0f1a]">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-slate-500 text-xs">Redirecting...</span>
      </div>
    </div>
  );
}

import { useEffect, useState, use } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { getMe, getSite, getToken, logout, createPortalSession, type SiteData } from "@/lib/api";
import SidebarLayout from "@/components/SidebarLayout";
import AccountSettingsModal from "@/components/AccountSettingsModal";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function DashboardLayout({
  children
}: {
  children?: React.ReactNode;
}) {
  const {  siteId  } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState<SiteData | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [plan, setPlan] = useState("free");
  const [limit, setLimit] = useState(10000);
  const [usage, setUsage] = useState(0);
  const [ready, setReady] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [siteData, userData] = await Promise.all([
          getSite(siteId as string).catch(() => null),
          getMe().catch(() => null),
        ]);
        if (siteData) setSite(siteData);
        if (userData) {
          setUserEmail(userData.email);
          setPlan(userData.plan);
          setLimit(userData.monthly_pageview_limit);
        }
      } catch {
        navigate("/login");
      } finally {
        setReady(true);
      }
    }
    load();
  }, [siteId]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted">
        <div className="h-5 w-5 rounded-full border-2 border-zinc-700 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <SidebarLayout
        siteId={siteId as string}
        siteName={site?.name}
        siteDomain={site?.domain}
        userEmail={userEmail}
        plan={plan}
        limit={limit}
        usage={usage}
        onManageBilling={async () => {
          try {
            const res = await createPortalSession();
            if (res?.portal_url) window.location.href = res.portal_url;
          } catch (err) {
            console.error("Portal error", err);
          }
        }}
        onAccountSettings={() => setShowAccountSettings(true)}
        onLogout={() => setShowConfirmLogout(true)}
      >
        {children}
      </SidebarLayout>

      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        email={userEmail}
        plan={plan}
        limit={limit}
        onManageBilling={async () => {
          try {
            const res = await createPortalSession();
            if (res?.portal_url) window.location.href = res.portal_url;
          } catch (err) {
            console.error("Portal error", err);
          }
        }}
      />

      <ConfirmDialog
        isOpen={showConfirmLogout}
        title="Sign Out"
        message="Are you sure you want to sign out of your Luminary Analytics workspace?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        onConfirm={async () => {
          setShowConfirmLogout(false);
          await logout();
          navigate("/login");
        }}
        onCancel={() => setShowConfirmLogout(false)}
      />
    </>
  );
}

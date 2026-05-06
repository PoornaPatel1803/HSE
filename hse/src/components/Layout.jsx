import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isCharterView = location.pathname.startsWith("/charter");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-default bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {isCharterView ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate("/")}
              >
                <ArrowLeft size={16} /> Back to Projects
              </button>
            ) : (
              <h1 className="text-xl font-semibold text-foreground">
                Health ● Safety ● Environment
              </h1>
            )}
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

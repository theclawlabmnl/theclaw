import AdminNav from "./AdminNav";
import LogoutButton from "./LogoutButton";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-app-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-brand-lockup">
            <div className="admin-brand-name">The Claw Lab MNL</div>
            <div className="admin-brand-subtitle">Nailtech dashboard</div>
          </div>

          <AdminNav />

          <div className="admin-topbar-action">
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="admin-main admin-main-clean">
        <div className="admin-content admin-content-clean">
          {children}
        </div>
      </main>
    </div>
  );
}

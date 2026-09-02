import AdminNav from "./AdminNav";
import LogoutButton from "./LogoutButton";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-app-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-brand-mark">CL</div>

          <div>
            <div className="admin-brand-name">
              The Claw Lab
            </div>

            <div className="admin-brand-subtitle">
              MNL Admin
            </div>
          </div>
        </div>

        <div className="admin-sidebar-label">
          Workspace
        </div>

        <AdminNav />

        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-user">
            <div className="admin-user-avatar">
              A
            </div>

            <div>
              <strong>Administrator</strong>
              <span>Dashboard access</span>
            </div>
          </div>

          <LogoutButton />
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-mobile-header">
          <div>
            <strong>The Claw Lab</strong>
            <span>Admin</span>
          </div>

          <AdminNav />
        </header>

        <main className="admin-main">
          <div className="admin-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
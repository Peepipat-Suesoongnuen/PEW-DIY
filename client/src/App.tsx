import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";import { AppShell } from "./components/AppShell";
import { Loading } from "./components/Loading";
import { SessionProvider, useSession } from "./lib/session";
import { CatalogPage } from "./pages/CatalogPage";
import { ItemDetailPage } from "./pages/ItemDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { RequestsPage } from "./pages/RequestsPage";

function ProtectedLayout() {
  const { user, status } = useSession();
  const location = useLocation();

  if (status === "loading") {
    return <Loading label="Loading…" />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[1200px] flex-col items-center justify-center px-4">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <a href="/catalog" className="mt-2 text-primary underline">
        Back to catalog
      </a>
    </main>
  );
}

export function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/requests/:id" element={<RequestsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SessionProvider>
  );
}

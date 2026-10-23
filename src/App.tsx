import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useSession } from "./auth";
import { AppShell } from "./components/AppShell";
import { AssetDetailPage } from "./pages/AssetDetailPage";
import { AssetsPage } from "./pages/AssetsPage";
import { AssistantPage } from "./pages/AssistantPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { OverviewPage } from "./pages/OverviewPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { PeoplePage } from "./pages/PeoplePage";
import { SignInPage } from "./pages/SignInPage";

function RequireSession() {
  const { signedIn, loading } = useSession();
  const location = useLocation();
  if (!signedIn) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  if (loading) return <div className="main muted">Loading your workspace…</div>;
  return <AppShell />;
}

export function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route element={<RequireSession />}>
        <Route index element={<OverviewPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="assets/:id" element={<AssetDetailPage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

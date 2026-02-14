import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { AuthGuard } from "./components/AuthGuard";
import { DashboardLayout } from "./components/DashboardLayout";
import { DashboardPage } from "./routes/dashboard";
import { SessionsPage } from "./routes/sessions";
import { ProfilePage } from "./routes/profile";
import { DeleteAccountPage } from "./routes/delete-account";

const rootRoute = createRootRoute({
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </AuthGuard>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const sessionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sessions",
  component: SessionsPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const deleteAccountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/delete-account",
  component: DeleteAccountPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  sessionsRoute,
  profileRoute,
  deleteAccountRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

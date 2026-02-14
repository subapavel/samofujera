import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { AuthGuard } from "./components/AuthGuard";
import { AdminLayout } from "./components/AdminLayout";
import { DashboardPage } from "./routes/dashboard";
import { UsersPage } from "./routes/users";

const rootRoute = createRootRoute({
  component: () => (
    <AuthGuard>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </AuthGuard>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users",
  component: UsersPage,
});

const routeTree = rootRoute.addChildren([dashboardRoute, usersRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

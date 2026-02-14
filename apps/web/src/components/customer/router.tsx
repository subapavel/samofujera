import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { AuthGuard } from "../AuthGuard";
import { CustomerLayout } from "./CustomerLayout";
import { DashboardPage } from "./routes/dashboard";
import { SessionsPage } from "./routes/sessions";
import { ProfilePage } from "./routes/profile";
import { DeleteAccountPage } from "./routes/delete-account";
import { LibraryPage } from "./routes/library";
import { LibraryProductPage } from "./routes/library-product";
import { OrdersPage } from "./routes/orders";
import { OrderDetailPage } from "./routes/order-detail";

const rootRoute = createRootRoute({
  component: () => (
    <AuthGuard>
      <CustomerLayout>
        <Outlet />
      </CustomerLayout>
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

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/knihovna",
  component: LibraryPage,
});

const libraryProductRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/knihovna/$productId",
  component: LibraryProductPage,
});

const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/objednavky",
  component: OrdersPage,
});

const orderDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/objednavky/$orderId",
  component: OrderDetailPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  sessionsRoute,
  profileRoute,
  deleteAccountRoute,
  libraryRoute,
  libraryProductRoute,
  ordersRoute,
  orderDetailRoute,
]);

export const router = createRouter({ routeTree, basepath: "/muj-ucet" });

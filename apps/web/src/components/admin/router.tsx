import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { AuthGuard } from "../AuthGuard";
import { AdminLayout } from "./AdminLayout";
import { DashboardPage } from "./routes/dashboard";
import { UsersPage } from "./routes/users";
import { ProductsPage } from "./routes/products";
import { ProductNewPage } from "./routes/product-new";
import { ProductEditPage } from "./routes/product-edit";
import { CategoriesPage } from "./routes/categories";
import { OrdersPage } from "./routes/orders";
import { OrderDetailPage } from "./routes/order-detail";

const rootRoute = createRootRoute({
  component: () => (
    <AuthGuard requiredRole="ADMIN">
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

const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty",
  component: ProductsPage,
});

const productNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty/novy",
  component: ProductNewPage,
  validateSearch: (search: Record<string, unknown>) => ({
    typ: (search.typ as string) || undefined,
  }),
});

const productEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty/$productId",
  component: ProductEditPage,
});

const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/kategorie",
  component: CategoriesPage,
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
  usersRoute,
  productsRoute,
  productNewRoute,
  productEditRoute,
  categoriesRoute,
  ordersRoute,
  orderDetailRoute,
]);

export const router = createRouter({ routeTree, basepath: "/admin" });

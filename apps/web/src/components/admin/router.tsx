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
import { CategoryListPage } from "./routes/category-list";
import { CategoryNewPage } from "./routes/category-new";
import { CategoryEditPage } from "./routes/category-edit";
import { OrdersPage } from "./routes/orders";
import { OrderDetailPage } from "./routes/order-detail";
import { MediaPage } from "./routes/media";

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
});

const productEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty/$productId",
  component: ProductEditPage,
});

const categoryListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty/kategorie",
  component: CategoryListPage,
});

const categoryNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty/kategorie/nova",
  component: CategoryNewPage,
});

const categoryEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty/kategorie/$categoryId",
  component: CategoryEditPage,
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

const mediaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/media",
  component: MediaPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  usersRoute,
  productsRoute,
  productNewRoute,
  productEditRoute,
  categoryListRoute,
  categoryNewRoute,
  categoryEditRoute,
  ordersRoute,
  orderDetailRoute,
  mediaRoute,
]);

export const router = createRouter({ routeTree, basepath: "/admin" });

import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { CatalogPage } from "./CatalogPage";
import { ProductDetailPage } from "./ProductDetailPage";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: CatalogPage,
});

const productRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$slug",
  component: ProductDetailPage,
});

const routeTree = rootRoute.addChildren([catalogRoute, productRoute]);

export const router = createRouter({ routeTree, basepath: "/katalog" });

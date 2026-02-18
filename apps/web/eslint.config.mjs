import nextConfig from "eslint-config-next";

const config = [
  {
    ignores: [".astro/**", "dist/**", ".next/**", ".open-next/**"],
  },
  ...nextConfig,
  {
    rules: {
      // Pre-existing patterns from Astro migration — form state initialization from query data
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default config;

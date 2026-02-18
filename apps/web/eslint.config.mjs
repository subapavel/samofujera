import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      // Pre-existing patterns from Astro migration — form state initialization from query data
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

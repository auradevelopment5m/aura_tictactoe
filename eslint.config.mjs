import nextCoreWebVitals from "eslint-config-next/core-web-vitals"

const config = [
  ...nextCoreWebVitals,
  {
    files: ["components/game-landing.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/purity": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
    ],
  },
]

export default config

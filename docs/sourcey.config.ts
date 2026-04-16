import { defineConfig } from "sourcey";

export default defineConfig({
  name: "Moxygen",
  theme: {
    colors: {
      primary: "#4a90d9",
      light: "#5ea0e9",
      dark: "#3a7bc8",
    },
  },
  repo: "https://github.com/sourcey/moxygen",
  editBranch: "main",
  editBasePath: "docs",
  navigation: {
    tabs: [
      {
        tab: "Documentation",
        slug: "",
        groups: [
          {
            group: "Getting Started",
            pages: ["introduction", "quickstart"],
          },
          {
            group: "Usage",
            pages: ["cli-reference", "programmatic-api", "custom-templates"],
          },
          {
            group: "Advanced",
            pages: ["grouping-modes"],
          },
        ],
      },
    ],
  },
  navbar: {
    links: [
      { type: "github", href: "https://github.com/sourcey/moxygen" },
      { type: "npm", href: "https://www.npmjs.com/package/moxygen" },
    ],
  },
  footer: {
    links: [
      { type: "github", href: "https://github.com/sourcey/moxygen" },
    ],
  },
});

import {defineConfig} from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "chanfana",
  description: "OpenAPI 3 and 3.1 schema generator and validator for Hono, itty-router and more!",
  cleanUrls: true,
  head: [["link", {rel: "icon", type: "image/png", href: "/assets/logo-icon.png"}]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/assets/logo-icon.png', // Assuming assets will be in public/assets
    outline: [2, 3],
    nav: [
      {text: "Home", link: "/"},
      {text: "Docs", link: "/introduction"},
      {text: "Examples", link: "/examples-and-recipes"},
    ],
    sidebar: [
      {
        text: "The Basics",
        items: [
          {text: "Introduction", link: "/introduction"},
          {text: "Getting Started", link: "/getting-started"},
          {text: "Command Line Interface (CLI)", link: "/cli"},
          {text: "Core Concepts", link: "/core-concepts"},
          {text: "Router Adapters", link: "/router-adapters"},
          {text: "Examples and Recipes", link: "/examples-and-recipes"},
        ],
      },
      {
        text: "Endpoints",
        items: [
          {text: "Defining Endpoints", link: "/endpoints/defining-endpoints"},
          {text: "Request Validation", link: "/endpoints/request-validation"},
          {text: "Response Definition", link: "/endpoints/response-definition"},
          {text: "Parameters", link: "/endpoints/parameters"},
        ],
      },
      {
        text: "Auto Endpoints",
        items: [
          {text: "Base Auto Endpoints", link: "/endpoints/auto/base"},
          {text: "D1 Auto Endpoints", link: "/endpoints/auto/d1"},
        ],
      },
      {
        text: "Advanced Stuff",
        items: [
          {text: "Error Handling", link: "/error-handling"},
          {text: "OpenAPI Customization", link: "/openapi-configuration-customization"},
          {text: "Advanced Patterns", link: "/advanced-topics-patterns"},
          {text: "Troubleshooting And FAQ", link: "/troubleshooting-and-faq"},
          {text: "Migration to Chanfana v3", link: "/migration-to-chanfana-3"},
        ],
      },
    ],
    socialLinks: [
      {icon: "github", link: "https://github.com/cloudflare/chanfana"},
      {icon: 'x', link: 'https://x.com/G4brym'}
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2024-present Cloudflare",
    },
    editLink: {
      pattern: 'https://github.com/cloudflare/chanfana/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  },
});

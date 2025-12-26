export const siteConfig = {
  name: "HiveMind",
  description: "Track and manage your investment portfolio with ease",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    twitter: "https://twitter.com/hivemind",
    github: "https://github.com/akshith27hiremath/hivemind_app",
  },
} as const;

export type SiteConfig = typeof siteConfig;

# ajsnow-me-web

Source for [www.ajsnow.me](https://www.ajsnow.me) — a [Next.js](https://nextjs.org/) (App Router) site
with TypeScript and Tailwind CSS, statically exported and deployed to GitHub Pages.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Edit `app/page.tsx` to change the home page.

## Deployment

Every push to `main` runs `.github/workflows/nextjs.yml`, which builds the static export (`out/`) and
deploys it to GitHub Pages. The custom domain is set by `public/CNAME` (`www.ajsnow.me`).

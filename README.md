# SocialModa.com

A premium, leather-jackets-only storefront with a built-in admin dashboard and visual website editor. It is a fully static site (React + TypeScript + Vite + Tailwind CSS) that runs on **GitHub Pages**. There is no server: the admin saves products, settings and images by committing files to your repository through the GitHub API, and GitHub Pages republishes the site.

There is intentionally **no shopping cart, checkout or payment** at this stage. Product pages have an "Enquire about this jacket" button that opens the contact form pre-filled with the chosen size and colour.

## What is included

**Storefront**
- Home (editable hero, floating product cards, story section), Shop (search and sort), About, Contact, custom 404.
- Every product has its own page at `/product/<slug>` with a gallery, thumbnails, price and discounted price, description, specifications, sizes, colours, SKU, related products and a back link. Pages are generated from data, nothing is hard-coded.
- Smooth page transitions, loading states, image shimmer placeholders, empty states, Product structured data (JSON-LD), keyboard and screen-reader friendly.
- **Real SEO and link previews:** at build time every product, shop, about and contact page gets its own HTML file with the correct title, description and Open Graph / Twitter tags, plus `robots.txt` and `sitemap.xml`. Shared product links show the jacket's name and photo in WhatsApp, iMessage, Facebook and Google. Products added after the last deploy are included on the next deploy (the admin commit triggers one).

**Admin dashboard** at `/admin` (not linked from the public site)
- Overview, Products, Add New Product, Website Editor, Media Library, Website Settings, GitHub Integration, Logout.
- Full product CRUD: multiple images with preview before saving, drag-and-drop reordering, removal, validation, publish/draft, search and status filter, delete with confirmation.
- Media Library: upload JPEG/PNG/WebP, preview, filenames, delete, reuse images in products and pages. Large photos are resized in the browser before upload.
- **Website Editor**: controls on the left, live preview on the right (the real storefront in an iframe). Desktop / tablet / mobile preview, per-device settings, undo/redo, save draft, publish, reset to default. It edits the real `site-config.json` that the public site loads.

## 1. Run it locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173 for the store and http://localhost:5173/admin for the dashboard.

On first visit to `/admin` you create the admin username and password (stored as a hash in your browser). Without a GitHub token the dashboard runs in **local mode**: everything you change is stored in this browser's localStorage so you can build and preview the entire site offline. Visitors on other devices will not see local changes.

`npm run build` produces the deployable site in `dist/`; `npm run preview` serves it.

## 2. Deploy to GitHub Pages

1. Create a GitHub repository and push this project to the `main` branch.
2. In the repository go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and deploys on every push to `main`. After the first run your site is live at `https://<username>.github.io/<repo>/`.
4. **Custom domain (socialmoda.com):** in Settings > Pages add your custom domain and follow GitHub's DNS instructions. Add a file named `CNAME` containing `socialmoda.com` to the `public/` folder so the build uses the root base path.

The workflow sets the correct base path automatically (`/` for a custom domain or a `<user>.github.io` repository, `/<repo>/` otherwise).

Each product, shop, about and contact page is also prerendered as its own HTML file, so those URLs return a normal 200 response with the right title and share preview. Any other deep link (for example a product added in the admin but not yet deployed, or `/admin/products`) works through the standard single-page-app trick for GitHub Pages: the build creates `404.html`, which redirects to the app, and a small script in `index.html` restores the URL. GitHub Pages technically answers those requests with status 404 before redirecting. Browsers and Google handle this fine, but if you want perfect status codes, use a host with rewrite rules (Netlify, Cloudflare Pages).

## 3. Connect the admin to GitHub (so changes go live)

1. On GitHub open **Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token**.
2. **Repository access:** only select repositories, then pick this repository.
3. **Permissions > Repository permissions:** set **Contents** to **Read and write**. Nothing else is needed.
4. Set a short expiry (30 to 90 days).
5. Open `/admin`, go to **GitHub Integration**, enter owner, repository, branch (usually `main`) and the token, and press **Test connection**. The dashboard checks that the repository exists, the branch exists and the token can write.

From then on:

| You do | The dashboard commits | Result |
| --- | --- | --- |
| Save a product | `public/data/products.json` | Live after the next deploy (1 to 2 minutes) |
| Publish in the Website Editor | `public/data/site-config.json` | Same |
| Upload an image | `public/assets/products/…` or `public/assets/site/…` | Same |

Repository layout used by the dashboard:

```
public/
  data/
    products.json
    site-config.json
  assets/
    products/   product photos
    site/       hero, logo, about image
```

While a deploy is running, the dashboard reads the newest data straight from the GitHub API, and images fall back to the repository files, so you always see your latest work.

If the repository already has the data files (it does, from the starter content) nothing else is needed. If they are missing, the Overview shows a **Create** button.

## 4. Using the Website Editor

Open **Website Editor** in the sidebar.

- Sections on the left: Branding, Colours and typography, Header, Hero, Product section, About and Contact pages, Footer and contact details, Layout and buttons.
- The preview on the right updates immediately. Switch **Desktop / Tablet / Mobile** in the toolbar. Controls marked with a device badge (hero height, hero headline size, product columns, page side spacing, section spacing) store a separate value per device: pick the device first, then adjust.
- **Undo / Redo** (buttons or Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z), **Reset to default**, and a button to discard changes back to the published version.
- **Save draft** keeps your work privately in this browser only (it is not committed, so unpublished ideas never become public). Publish when you want it live; use the same browser to continue a draft. **Publish** writes `site-config.json` and makes it live for everyone.
- - **Space around the picture** (Product section) sets an inset between the card edge and the jacket photo; 0 fills the frame. **Image size** chooses crop versus fit.
- Use the page selector to preview Home, Shop, About, Contact or a product page.

## 5. Authentication: read this

The login screen is **demo authentication**. Anything that runs in a browser can be inspected or bypassed, so a front-end password check cannot be production-grade security. It exists to keep casual visitors out of the admin screens.

What actually protects your website is the **GitHub token**: without a valid token with write access to your repository, nobody can publish a change, whatever they do in the browser.

Two ways to set the admin credentials:

1. **First-run setup (default):** the first time you open `/admin` in a browser you choose a username and password. A salted SHA-256 hash is stored in that browser's localStorage. Other browsers need their own setup.
2. **Same credentials on every device:** compute a hash and set two repository variables (Settings > Secrets and variables > Actions > **Variables**):
   ```bash
   npm run hash-password -- "your strong password"
   ```
   Create the variables `ADMIN_USER` (your username) and `ADMIN_PASSWORD_SHA256` (the printed hash), then redeploy. The hash ends up inside the public JavaScript, so choose a long, unique password: a weak one can be cracked offline.

### Limitations of client-side GitHub authentication

- The token is stored in the admin's browser (sessionStorage by default, localStorage only if "Remember" is ticked) and sent only to `api.github.com`. It is never written to the repository or to any file you deploy.
- Anything running in that browser (a malicious extension, a script injected through a vulnerability) could read it. Use a **fine-grained token limited to this one repository with only Contents: Read and write**, a short expiry, and never tick "Remember" on shared computers.
- There are no individual user accounts, roles or audit trail beyond GitHub's commit history.
- Sessions are 8 hours; logging out clears the session.

### Production authentication (recommended for teams)

If several people manage the store, or you need real security, put a small authentication proxy between the dashboard and GitHub:

- Create a **GitHub App** or **OAuth App** and run its token exchange on a serverless function (Cloudflare Workers, Netlify Functions, Vercel). The client secret stays on the server.
- Sign editors in with GitHub OAuth and allow only repository collaborators. The browser then receives short-lived tokens instead of a long-lived personal access token.
- Replace `src/lib/auth.ts` and the token handling in `src/lib/github.ts` with calls to that proxy. The rest of the app does not need to change: all reads and writes go through `src/lib/github.ts` and `src/context/AdminStoreContext.tsx`.
- Open-source Git-based CMSs such as Decap CMS and Sveltia CMS use exactly this pattern if you prefer an off-the-shelf OAuth proxy.

## 6. Project structure

```
src/
  main.tsx, App.tsx          app shell and routes (admin is code-split)
  types.ts                   Product and SiteConfig types
  data/defaultConfig.ts      default design and content
  context/                   Site (public data), AdminStore (CRUD, GitHub, media), Auth, Toast, Confirm
  lib/                       github.ts, data.ts, images.ts, auth.ts, theme.ts, seo.ts, utils.ts
  components/store/          header, hero, product cards, footer, layout
  pages/                     Home, Shop, ProductPage, About, Contact, NotFound
  admin/                     dashboard pages
  admin/editor/              Website Editor (controls, live preview, history)
public/data/                 products.json, site-config.json (starter content)
public/assets/               generated placeholder imagery
scripts/                     seed generator, password hasher, 404 post-build step
.github/workflows/deploy.yml GitHub Pages deployment
```

## 7. Replace the placeholder content

The starter products, product images, hero and about images are **generated illustrations** so the demo looks complete. Replace them with real photography:

- New products are created as **Published** by default (switch to Draft in the form if you want to hide one). Products: **Products > Edit**, upload photos, remove the placeholders.
- Hero, logo, about image: **Website Editor** (Hero, Branding, About sections).
- Brand copy, contact details and social links are examples. The social links point to the networks' home pages until you set your own addresses in **Website Editor > Footer**.

## 8. Notes and limits

- **Contact form:** static hosting cannot send email itself. By default the form opens the visitor's email app with the message filled in. For real delivery, create a free form on [Formspree](https://formspree.io) (or a compatible service), then paste its address into **Website Editor > Footer and contact details > Contact form service address**. Messages are then sent in the page and land in your inbox, with a thank-you shown to the visitor.
- **Deploy delay:** GitHub Pages needs 1 to 2 minutes after each commit. Each save is one commit, and the workflow cancels outdated runs.
- **Browser storage:** in local mode images are compressed and stored in localStorage (about 5 MB total). Connect GitHub for real image storage.
- **Repository visibility:** GitHub Pages on the free plan needs a public repository. The product data and images you publish are public by nature.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Permission denied (403)" | The token lacks **Contents: Read and write** on this repository. |
| "Not found (404)" | Check owner, repository and branch spelling, and that the token has access to the repository. |
| Saved but nothing changed on the live site | Wait for the workflow run (Actions tab). Hard-refresh afterwards. |
| New image shows a placeholder | The deploy has not finished yet; it appears after the next deploy. |
| Deep link shows a blank page after deploy | Make sure Pages source is **GitHub Actions** and the latest workflow run succeeded. |

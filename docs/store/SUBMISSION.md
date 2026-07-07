# GlowNote — Chrome Web Store submission runbook (STAGED)

Everything is prepared. This is the exact sequence **Damien** performs in his own
Chrome Web Store developer account. Nothing here has been (or can be) auto-submitted —
publishing requires the developer login.

## Package to upload
```
glownote/.output/glownote-0.1.0-chrome.zip   (694 KB, chrome-mv3, local-first)
```
Regenerate anytime with: `pnpm build && pnpm zip` (outputs to `.output/`).

## Assets (in docs/store/)
- `store-icon-128.png` — 128×128 store icon
- `screenshots/1-highlight.png … 5-pdf-local.png` — five 1280×800 screenshots
- `STORE-LISTING.md` — all copy fields + privacy answers (copy-paste source)

---

## Steps

1. **Developer account** — go to https://chrome.google.com/webstore/devconsole
   - If first time: pay the one-time **$5** registration fee and accept the
     developer agreement. (One-time, per Google account.)

2. **Create item** — click **"+ Add new item"** → drag in
   `glownote-0.1.0-chrome.zip` → **Upload**.
   - The console reads the manifest (name, version, 5 permissions, icons).

3. **Store listing tab** — paste from `STORE-LISTING.md`:
   - Product name, Summary, Detailed description, Category = **Productivity**,
     Language = **English (US)**.
   - **Store icon:** upload `store-icon-128.png`.
   - **Screenshots:** upload all five from `screenshots/` in numbered order
     (1280×800 each — the console accepts these directly).

4. **Privacy practices tab** — from `STORE-LISTING.md`:
   - **Single purpose:** paste the single-purpose description.
   - **Permission justifications:** paste one line per permission (5 permissions
     + the host-permission/content-script justification).
   - **Remote code:** select **"No, I am not using remote code."**
   - **Data usage:** check **nothing** in the data-collection matrix (collects no
     user data), then tick the **three certification checkboxes**.
   - **Privacy policy URL:** leave blank (not required — no data collected).

5. **Distribution** — Visibility: **Public** (or Unlisted for a soft launch —
   Damien's call). Regions: **All regions**. Pricing: **Free**.

6. **Submit** — click **"Submit for review."**
   - Typical review: a few hours to a few days. Local-first + no OAuth ⇒ fast lane
     (no OAuth-scope verification, no privacy-policy gate).

---

## Deferred: Google Drive export (do NOT ship in v0.1.0)

The repo contains a code-complete Google Drive export feature
(`src/lib/sync/gdrive.ts`, background auto-sync handler, options UI). It is
**gated off** for v0.1.0:
- The `identity` permission was removed from the manifest.
- The Drive-sync section was removed from the options page.
- `autoSync` defaults to `false` and is unreachable from the UI; the background
  handler early-returns, so no code path touches the network.

Why deferred:
- The manifest has **no `oauth2.client_id`**, so the feature does not function today.
- Shipping it would require a Google Cloud OAuth client, **OAuth scope
  verification** (weeks), and a **published privacy policy URL** — all of which
  would delay approval of an otherwise fast-lane local-first extension.

To re-enable later (a future version):
1. Create a Google Cloud OAuth 2.0 client (Chrome App type) with the
   `drive.file` scope; add `oauth2: { client_id, scopes }` to `wxt.config.ts`.
2. Restore `identity` in `permissions` and the Drive-sync `<section>` in
   `src/entrypoints/options/App.svelte` (git history has both).
3. Publish a privacy policy and add its URL; update the data-usage disclosures
   (Website content handled, user-initiated, not sold) in the privacy tab.
4. Bump version, rebuild, resubmit — expect OAuth verification review.

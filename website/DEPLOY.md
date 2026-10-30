# Deploying OppNexa (Vercel + Resend)

The site is a static page plus one serverless function (`api/contact.js`) that
emails you each contact-form submission through Resend. The Resend API key lives
only in Vercel's environment variables — never in the browser.

## One-time setup

### 1. Resend
1. Sign in at https://resend.com.
2. **API Keys → Create API Key** (name it "OppNexa site"). Copy it — you only see it once.
3. **Domains → Add Domain → `oppnexa.com`**, then add the DNS records Resend shows
   (SPF/DKIM) at your domain registrar. This lets you send *from* `hello@oppnexa.com`.
   - Until the domain shows **Verified**, leave `FROM_EMAIL` as `onboarding@resend.dev`.
     In that test mode Resend only delivers to the email on your Resend account.

### 2. Vercel
1. Sign in at https://vercel.com and **Add New → Project**.
2. Import the `oppnexa` GitHub repo. **Set Root Directory to `website`**
   (the repo root is the whole project; the deployable site lives in `website/`).
   No build command or framework needed — Vercel serves the static files and
   turns `api/contact.js` into a function automatically.
3. **Settings → Environment Variables** — add three:
   | Name | Value |
   |------|-------|
   | `RESEND_API_KEY` | the key from Resend |
   | `CONTACT_EMAIL`  | where leads should land, e.g. `you@oppnexa.com` |
   | `FROM_EMAIL`     | `OppNexa <hello@oppnexa.com>` once verified, else `onboarding@resend.dev` |
4. **Deploy.** Then **Settings → Domains → add `oppnexa.com`** and point your
   registrar's DNS to Vercel as instructed.

## Test it
- Submit the form on the live site → the email should arrive at `CONTACT_EMAIL`
  within seconds. Resend's dashboard **Logs** shows every send and any error.

## Local note
Opening the site with a plain static server (e.g. the local preview) has no
`/api/contact`, so the form falls back to opening your email app — that's
expected. The Resend path only runs on Vercel (or `vercel dev`).

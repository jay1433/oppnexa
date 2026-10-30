# OppNexa

Marketing site for **OppNexa** — we find open government bid opportunities across
the US and India, match them to your company, and deliver a weekly report with the
contacts you need to pursue them. You focus on winning.

## Structure

| Path | What it is |
|------|------------|
| `website/` | The live marketing site (static HTML/CSS/JS) + the Resend contact function |
| `website/api/contact.js` | Vercel serverless function that emails each enquiry via Resend |
| `brand/` | Logo and brand exploration files (design reference, not deployed) |

## Deploy

The site deploys on **Vercel**. Set the project's **Root Directory** to `website`.
Full step-by-step (Resend keys, DNS, env vars) is in
[`website/DEPLOY.md`](website/DEPLOY.md).

## Local preview

```bash
cd website
python -m http.server 5510
```

The contact form's email delivery only runs on Vercel (it needs the serverless
function); locally the form falls back to opening your email app.

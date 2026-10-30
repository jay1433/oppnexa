// OppNexa contact form → Resend
// Runs as a Vercel serverless function. The browser posts the form here;
// this code (never the browser) holds the Resend API key.
//
// Required env vars (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   your Resend API key (keep secret)
//   CONTACT_EMAIL    where enquiries are emailed to     (e.g. you@oppnexa.com)
//   FROM_EMAIL       verified Resend sender             (e.g. OppNexa <hello@oppnexa.com>)
//                    until oppnexa.com is verified in Resend, use: onboarding@resend.dev

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const TO_EMAIL = process.env.CONTACT_EMAIL || 'hello@oppnexa.com';
// Must be an address on a domain verified in Resend. resend.dev works for testing.
const FROM_EMAIL = process.env.FROM_EMAIL || 'OppNexa <onboarding@resend.dev>';

const clean = (s) => String(s == null ? '' : s).trim();
const esc = (s) =>
  clean(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    // Honeypot — a bot filled the hidden field. Accept silently so it won't retry.
    if (clean(body._gotcha)) return res.status(200).json({ ok: true });

    const name = clean(body.name);
    const company = clean(body.company);
    const email = clean(body.email);
    const sector = clean(body.sector);
    const message = clean(body.message);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !company || !emailOk) {
      return res
        .status(400)
        .json({ error: 'Please include your name, company, and a valid email.' });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set.');
      return res.status(500).json({ error: 'Email is not configured yet.' });
    }

    const html =
      '<h2 style="margin:0 0 16px;font-family:sans-serif">New OppNexa enquiry</h2>' +
      '<table style="font-family:sans-serif;font-size:15px;line-height:1.6;border-collapse:collapse">' +
      '<tr><td style="padding:2px 12px 2px 0;color:#5B6B82">Name</td><td><strong>' + esc(name) + '</strong></td></tr>' +
      '<tr><td style="padding:2px 12px 2px 0;color:#5B6B82">Company</td><td><strong>' + esc(company) + '</strong></td></tr>' +
      '<tr><td style="padding:2px 12px 2px 0;color:#5B6B82">Email</td><td>' + esc(email) + '</td></tr>' +
      '<tr><td style="padding:2px 12px 2px 0;color:#5B6B82">Industry</td><td>' + (esc(sector) || '—') + '</td></tr>' +
      '</table>' +
      '<p style="font-family:sans-serif;font-size:15px;line-height:1.6;margin-top:16px">' +
      (esc(message).replace(/\n/g, '<br>') || '—') + '</p>';

    const text =
      'New OppNexa enquiry\n\n' +
      'Name: ' + name + '\nCompany: ' + company + '\nEmail: ' + email +
      '\nIndustry: ' + (sector || '—') + '\n\n' + (message || '—');

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      replyTo: email,
      subject: 'New OppNexa enquiry — ' + company,
      html: html,
      text: text,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(502).json({ error: 'Could not send right now. Please email us directly.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: 'Unexpected error. Please email us directly.' });
  }
}

# OMA Designs — Website & CRM Guide

Everything the team needs to use the new website and lead system. **No passwords are in this document** — they are shared privately.

---

## 1. Two sites: Live and Test

| | **Live site** | **Test site** |
|---|---|---|
| Link | [interior-crm-taupe.vercel.app](https://interior-crm-taupe.vercel.app) | [Open test site](https://interior-crm-git-dev-manasigarg22s-projects.vercel.app) |
| Who it's for | Real customers and the OMA team | Trying things out and checking changes |
| Data | Real customer enquiries | Sample data only (about 50 made-up leads) |
| New-lead alert emails | Sent to amank6787@gmail.com | Off — nothing is sent |
| Shows in Google | Yes | No |
| How to recognise it | Normal site | Yellow **"TEST SITE"** bar at the top of every page |

**Golden rule:** never submit test enquiries on the Live site. They create real leads and send real alerts. Always test on the Test site.

> Test site access: currently opens only for people signed in to the project's Vercel account. Public access for the owner is being switched on.

---

## 2. Customer pages (public — no login)

| Page | Live link | Test link | What it does |
|---|---|---|---|
| Home | [Open](https://interior-crm-taupe.vercel.app/) | [Open](https://interior-crm-git-dev-manasigarg22s-projects.vercel.app/) | Services, recent work, process, contact |
| Start your project | [Open](https://interior-crm-taupe.vercel.app/start-project) | [Open](https://interior-crm-git-dev-manasigarg22s-projects.vercel.app/start-project) | 5-step enquiry form (about 2 minutes) |
| Thank you | Shown after the form | Shown after the form | Confirms the enquiry and gives a reference number |

**Link for Instagram bio, ads and WhatsApp:** [interior-crm-taupe.vercel.app/start-project](https://interior-crm-taupe.vercel.app/start-project)

---

## 3. Team pages (login required)

### Sign in
| Page | Live link | Test link |
|---|---|---|
| Sign in | [Open](https://interior-crm-taupe.vercel.app/login) | [Open](https://interior-crm-git-dev-manasigarg22s-projects.vercel.app/login) |
| Forgot password | [Open](https://interior-crm-taupe.vercel.app/forgot-password) | [Open](https://interior-crm-git-dev-manasigarg22s-projects.vercel.app/forgot-password) |

The reset-password page opens from the reset email — you never visit it directly.

### Ready to use
| Page | Live link | Test link | What it's for |
|---|---|---|---|
| Dashboard | [Open](https://interior-crm-taupe.vercel.app/dashboard) | [Open](https://interior-crm-git-dev-manasigarg22s-projects.vercel.app/dashboard) | Today at a glance — new leads, hot leads, follow-ups due, recent enquiries |
| Leads | [Open](https://interior-crm-taupe.vercel.app/leads) | [Open](https://interior-crm-git-dev-manasigarg22s-projects.vercel.app/leads) | Every enquiry, with search and filters. Click a lead for full details, Call / WhatsApp / Email buttons, status, notes and follow-ups |
| Pipeline | [Open](https://interior-crm-taupe.vercel.app/pipeline) | [Open](https://interior-crm-git-dev-manasigarg22s-projects.vercel.app/pipeline) | Board view — drag leads between stages |
| Follow-ups | [Open](https://interior-crm-taupe.vercel.app/follow-ups) | [Open](https://interior-crm-git-dev-manasigarg22s-projects.vercel.app/follow-ups) | Calls and visits due today, overdue and upcoming |
| Customers | [Open](https://interior-crm-taupe.vercel.app/customers) | [Open](https://interior-crm-git-dev-manasigarg22s-projects.vercel.app/customers) | One profile per person, all their enquiries together |

### Coming later
Projects · Campaigns · Analytics · Users & Roles · Settings — the pages open but show "Planned".

---

## 4. Logins

### Live site
| Email | Role | Can do |
|---|---|---|
| amank6787@gmail.com | Super Admin | Everything |
| mgarg2121@gmail.com | Admin | Everything except creating other admins |

### Test site (sample data — separate passwords from Live)
| Email | Role | Use it to see… |
|---|---|---|
| amank6787@gmail.com | Super Admin | Everything |
| admin@example.com | Admin | The admin view |
| manager@example.com | Sales Manager | Whole pipeline, assigning leads |
| sales1@example.com | Sales Executive | Only their own assigned leads |
| designer@example.com | Designer | Assigned leads, read-only on sales |
| viewer@example.com | Viewer | Read-only everything |

**Password tips**
- Passwords are shared privately — never by email or group chat.
- Forgot your password? Use [Forgot password](https://interior-crm-taupe.vercel.app/forgot-password). *Until a custom domain is connected, the reset email only reaches amank6787@gmail.com.*

---

## 5. Lead stages

New → Contacted → Qualified → Consultation → Site visit → **Quotation → Design** → Negotiation → **Won** / **Lost** (or On hold)

Move a lead from its detail page (**Change status**) or by dragging it on the [Pipeline](https://interior-crm-taupe.vercel.app/pipeline) board.

---

## 6. New-lead alerts (Live site only)

- Every enquiry emails **amank6787@gmail.com** within seconds.
- The email has **every detail** the customer entered — name, phone, location, property, areas, budget, timeline and notes — plus **Call**, **WhatsApp** and **Open in CRM** buttons.
- **Reply** in Gmail goes straight to the customer when they gave an email.
- Alerts come from `onboarding@resend.dev`. In Gmail, create a filter for that address → **Never send it to Spam**.

---

## 7. How changes go live

1. A change is made and appears on the **Test site** first.
2. Owner checks it on the Test site.
3. Once approved, it is published to the **Live site**.

Nothing reaches customers without being seen on the Test site first.

---

## 8. Current limits

| Item | Status |
|---|---|
| Photo / document uploads | Off until cloud storage is set up |
| Website address | Temporary Vercel link — own domain to be connected later |
| WhatsApp alerts | Not yet — email only |
| Change-password screen | Not yet — use Forgot password |
| Phone / WhatsApp number on the site | Not shown yet (by choice) |
| Testimonials, own project photos | To be added — current photos are samples |

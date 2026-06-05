# Deployment & Integration Guide
### Hotel Booking Automation — ViralFood / Chinaglia S.R.L.

This site is a **static website** (HTML + CSS + a little JS). It deploys to Vercel or
Netlify with no build step. Every form submission is captured **twice** — emailed to
`info@chinagliafederico.com` **and** appended as a row in a Google Sheet — via a small
Google Apps Script backend.

```
Visitor submits form
        │  POST (fields + form type + timestamp)
        ▼
Google Apps Script Web App
        ├──►  ① Appends a row to your Google Sheet   (lead / CRM database)
        └──►  ② Emails info@chinagliafederico.com     (instant notification)
```

Files in this folder:

| File | What it is |
|------|------------|
| `Hotel Booking Automation.html` | The website |
| `styles.css` | Styles |
| `config.js` | **You edit this** — holds your backend URL |
| `google-apps-script.gs` | The backend code (paste into Apps Script) |
| `tweaks.jsx`, `tweaks-panel.jsx` | Design-only preview tools — **delete before deploy** (see step 4) |
| `assets/` | Logo images |

---

## STEP 1 — Create the Google Sheet + backend (≈5 min)

1. Go to <https://sheets.new> and create a blank Google Sheet. Name it e.g.
   **"ViralFood — Leads"**. (If `info@chinagliafederico.com` is a Google Workspace
   account, do this **signed in as that account** so notification emails come from your
   own domain.)
2. In the Sheet: **Extensions → Apps Script**.
3. Delete the sample `function myFunction() {}`, then open `google-apps-script.gs` from
   this folder, copy **everything**, and paste it in. Click **Save** (💾).
4. Click **Deploy → New deployment**.
   - Click the gear ⚙ next to "Select type" → **Web app**.
   - **Description:** `ViralFood leads`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**
   - Click **Deploy**. Google will ask you to **authorize** — approve it (you may see a
     "Google hasn't verified this app" screen → *Advanced* → *Go to … (unsafe)* → Allow.
     This is normal for your own private script.)
5. Copy the **Web app URL** (it ends in `/exec`).

> **Test it:** paste that URL into a browser. You should see
> *"ViralFood lead endpoint is live."*

---

## STEP 2 — Connect the site to the backend

1. Open `config.js` and paste your URL between the quotes:
   ```js
   window.LEAD_ENDPOINT = "https://script.google.com/macros/s/AKfyc..../exec";
   ```
2. Save. That's the only line you need to change.

> Until this is filled in, the form still works — it falls back to opening the visitor's
> email app addressed to `info@chinagliafederico.com`. Once the URL is set, submissions
> go silently to the Sheet + email instead.

**Test locally / after deploy:** submit the form once. Within a few seconds you should
see (a) a new row in the Sheet and (b) an email at `info@chinagliafederico.com`.

---

## STEP 3 — Whenever you change the backend code

Apps Script serves the **last deployed version**, not your latest edit. After editing
`google-apps-script.gs`: **Deploy → Manage deployments → ✏️ Edit → Version: New version
→ Deploy.** (The `/exec` URL stays the same.)

---

## STEP 4 — Prepare the files for production

The `tweaks.jsx` / `tweaks-panel.jsx` files and the React `<script>` tags at the bottom
of the HTML are **design-preview tools only** — not needed on the live site. Before
deploying, you can remove them for a faster page:

1. Delete `tweaks.jsx` and `tweaks-panel.jsx`.
2. In `Hotel Booking Automation.html`, delete the block at the bottom marked
   `<!-- Tweaks panel (React) -->` (the four `<script>` tags after it).

Optional but recommended: rename `Hotel Booking Automation.html` → **`index.html`** so
the site loads at the bare domain (`viralfood.it/…`) with no filename in the URL.

---

## STEP 5 — Deploy to Vercel **or** Netlify

You only need one. Both serve this folder as-is (no build command, no framework).

### Option A — Netlify (drag-and-drop, easiest)
1. Sign in at <https://app.netlify.com> → **Add new site → Deploy manually**.
2. Drag the **`hotel-automation` folder** onto the upload area.
3. Done — you get a `*.netlify.app` URL. Test the form.

### Option B — Vercel
1. Put the folder in a Git repo (GitHub/GitLab) **or** use the Vercel CLI (`npx vercel`).
2. At <https://vercel.com> → **Add New → Project** → import the repo.
3. Framework preset: **Other**. Build command: *(leave empty)*. Output dir: `./`.
4. Deploy. You get a `*.vercel.app` URL. Test the form.

> CORS note: the form posts with `mode: "no-cors"`, which is exactly what Google Apps
> Script expects — it works from any domain (localhost, `*.netlify.app`, your real
> domain) with no extra configuration.

---

## STEP 6 — Connect your domain via Aruba DNS

Do this in your **Aruba** control panel (where the domain is registered). You point the
domain at Vercel/Netlify by editing DNS records. Keep MX records untouched so email
keeps working.

### If you deployed to **Netlify**
In Netlify: **Site settings → Domain management → Add a domain** → enter your domain.
Netlify shows you the target values. Then in **Aruba → Gestione DNS**:

| Record | Host / Name | Value |
|--------|-------------|-------|
| `A`    | `@` (root)  | `75.2.60.5` |
| `CNAME`| `www`       | `<your-site>.netlify.app` |

### If you deployed to **Vercel**
In Vercel: **Project → Settings → Domains → Add** your domain. Vercel shows the exact
values (confirm them there — they can change). Then in **Aruba → Gestione DNS**:

| Record | Host / Name | Value |
|--------|-------------|-------|
| `A`    | `@` (root)  | `76.76.21.21` |
| `CNAME`| `www`       | `cname.vercel-dns.com` |

### In all cases
- **Delete** any old/parking `A` or `CNAME` records for `@` and `www` that point
  elsewhere (e.g. Aruba's default hosting), or they'll conflict.
- **Do NOT touch `MX` records** — those route `info@chinagliafederico.com` email.
- DNS changes can take from a few minutes up to ~24h to propagate.
- Both Vercel and Netlify issue a free HTTPS (SSL) certificate automatically once the
  domain verifies — no action needed.

---

## Adding more forms later (contact / booking)

The capture system already supports multiple form types. To add another form anywhere on
the site, just give the `<form>` two attributes:

```html
<form data-lead data-form-type="contact"> … </form>
```

- `data-lead` → activates capture (email + Sheet).
- `data-form-type` → the label stored in the Sheet's "Form type" column and the email
  subject (e.g. `contact`, `booking`, `demo request`).

Add a sibling `<div class="form-ok"> … </div>` right after the form for the success
message (copy the existing one). Every field's `name` is captured automatically; add a
matching column in `COLUMNS` inside `google-apps-script.gs` if you want it in its own
Sheet column (otherwise it's still saved in the "Raw data" column).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No email, no row | Confirm `window.LEAD_ENDPOINT` in `config.js` ends in `/exec`. Visit the URL — it should say "endpoint is live". |
| Row appears, no email | Check Apps Script **Executions** log for a MailApp quota/permission error. Re-authorize the script. |
| "Google hasn't verified" warning | Expected for a private script — *Advanced → Go to … → Allow*. |
| Changed the script, nothing changed | You must **re-deploy a new version** (Step 3). |
| Emails go to spam | Run the script under the Workspace account that owns `chinagliafederico.com`, or add a rule to never-spam that sender. |

---

**Questions?** The whole backend is the single `google-apps-script.gs` file — readable,
editable, and free to run on Google's infrastructure.

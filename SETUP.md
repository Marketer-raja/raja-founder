# Connecting the site to Supabase (one-time, ~10 minutes)

1. **Create a project** at supabase.com (free plan is fine).
2. **Run the database script**: open `supabase/schema.sql`, replace `YOUR_ADMIN_EMAIL` on the last line
   with your own email, then paste the whole file into Supabase -> SQL Editor -> Run.
3. **Create your admin login**: Authentication -> Users -> Add user -> use that same email + a strong password
   (tick "Auto confirm"). Then Authentication -> Sign In / Providers -> turn OFF "Allow new users to sign up".
4. **Add the keys**: Project Settings -> API. Copy the Project URL and the anon / publishable key into `config.js`.
   (Never use the service_role / secret key.)
5. **Upload everything to GitHub** (replace the old files). Open `admin.html` and sign in with the Supabase account.

## What is stored where
| Website part | Supabase table | Admin tab |
|---|---|---|
| Pop-up text, timing, on/off | `popup_settings` | Pop-up |
| Pop-up messages from visitors | `popup_submissions` | Pop-up (bottom) |
| Newsletter sign-ups | `newsletter_subscribers` | Newsletter |
| Featured circles + headline | `featured_settings`, `featured_founders` (+ `featured` storage bucket for photos) | Featured section |
| Founders by region | `regions` | Founders by region |
| Founder directory | `founders.json` on GitHub (written by the admin panel) | Founders |

If Supabase is unreachable the site falls back to its built-in content, so it never shows a blank page.

## Adding a founder (Founders tab)
Fill in the form, choose a photo, and leave **Create or update this founder's life-story page** ticked. When you press
**Publish founder**, the admin panel makes **one GitHub commit** that contains everything below, so the site is never half-updated:

| File | What changes |
|---|---|
| `founders.json` | the founder is added (or updated) in the directory |
| `<page-address>.html` | the life-story page, built from `founder-template.html` |
| `script.js` and `index.html` | the founder is added to the `HISTORY` list, so the **History** button appears (`script.js?v=` is raised by 1 so browsers load the new file) |
| `sitemap.xml` | the page URL is added (or its `lastmod` date refreshed) |
| `photos/...` | the photo |
| `page-src/<page-address>.json` | the text you typed, so you can edit the page later |

**Page content format** (the big text box; use *Insert example layout* to start):
`## Heading` starts a section, plain lines are paragraphs, `- item` is a bullet, `[words](https://link)` is a link,
`**words**` is bold. Three headings are special: `## Timeline` (lines like `2014 | Launches the company`),
`## The takeaway` (shown in the highlighted box) and `## Sources` (small print after the button). *Preview page* opens the finished page without publishing.

**Editing and deleting**
- *Edit* on a founder whose page was made here reloads its text; saving rebuilds the page. If you change the page address, the old page is removed.
- *Edit* on a founder with an older hand-made page leaves that page alone unless you tick the box (which replaces it).
- *Delete* removes the founder, and for pages made here also the page, its text file, the photo, the sitemap entry and the `HISTORY` entry.
  A hand-made page is never deleted: only its `HISTORY` entry is removed.
- To change how every generated page looks, edit `founder-template.html` (keep the `{{PLACEHOLDERS}}`).

The GitHub token needs **Contents: Read and write** on the repository (same as before).

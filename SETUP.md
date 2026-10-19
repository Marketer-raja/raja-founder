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
| Founder directory | still `founders.json` on GitHub | Founders |

If Supabase is unreachable the site falls back to its built-in content, so it never shows a blank page.

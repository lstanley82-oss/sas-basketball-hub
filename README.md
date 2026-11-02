# SAS Basketball | Coaches & Players Hub

**Version:** 0.1 interactive MVP  
**Program:** Shanghai American School, Puxi Girls Varsity  
**Design:** Courtside + Performance Lab hybrid, with original SAS branding assets from the supplied school document.

## What works today

The standalone prototype is immediately usable in your browser and requires **no npm or installation**. It includes:

- Branded landing page and separate Players' Hub / Coaches' Hub.
- Coach dashboard and a mobile-friendly practice planner with exactly 3 Primary Priorities and 2 Peripheral Priorities.
- Flexible activity sequencing drawn from a collaborative Drill Library.
- Default 100 Layups Challenge and post-practice check-in, including actual activities completed.
- Coach-private post-practice observations in a separate data entity.
- Benchmark results and priority-frequency summary (not fabricated instructional minutes).
- Players' Hub with individual goals, assignments, responses, reflections, and coach-approved drill resources.
- Working create/update flows using fictional demonstration data saved in this browser's localStorage.
- Optional live Supabase email/password authentication with row-level database policies.

**The demo role buttons are for preview only. They do not provide security. Do not enter identifiable student data in demo mode.**

## Try the interactive demo

Option A: Open `index.html` directly in a modern browser.  
Option B: From this folder run:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` and select either demo hub. Create a practice, add drills, complete a benchmark check-in, create an assignment, and switch to the Players' Hub to test the published experience.

## Configure real Supabase access

1. Create a **new, private** Supabase project dedicated to the SAS Basketball program (do not reuse a project containing student data without school approval).
2. In Supabase SQL Editor, run `supabase/migrations/001_initial_schema.sql`.
3. Create/invite users from **Authentication > Users** using approved school email accounts. Public self-signup should be disabled in Supabase Auth settings.
4. For each authorized account, use the SQL Editor under administrator access to provision its role. Example, replacing both placeholders with your real values:

```sql
insert into public.profiles (id, display_name, role)
values ('REAL-AUTH-USER-UUID', 'Coach Name', 'coach');
```

For players use `role = 'player'`. Only trusted administrators should be allowed to assign or change roles. Do **not** expose this SQL pathway to an app screen.
5. Copy `config.example.js` to `config.js` and set the Supabase **Project URL** and **publishable (or legacy anon) key**. These public client values are expected in browser code. **Never put a secret key or service_role key into this frontend.**
6. Serve the site over HTTPS. When credentials are present, it switches from demo to real authentication and the database. No demonstration accounts are allowed into production mode.
7. Test with at least one coach and two player test accounts: verify that players cannot retrieve unpublished practices, unpublished drills, another student's goals/responses/reflections, or `practice_notes` through direct database queries.
8. Confirm the school approves hosting and storage of student information, data retention and deletion, footage policies, and access from Shanghai. Do not deploy with real students before those checks.

## Deploy

Static hosting is supported. Publish the folder's files (including `public/assets`) to your hosting provider. Suitable candidates include Netlify, Vercel, and GitHub Pages, but test reachability and performance from school Wi-Fi and mobile networks in Shanghai before selecting one. Make the GitHub repository **private**. Store only Supabase's public key in the site, never privileged secrets. The project files are ready for Git version control.

Once deployed, the production HTTPS URL becomes the destination for a single QR code. Authentication assigns the user to the correct hub. Do not generate/print the QR code until the final URL is confirmed.

## Known limits, planned next

- A single girls varsity team and 2026–27 season are represented in this first build; database records have a `season_label` for later expansion.
- Mobile app installation/offline synchronization and push notifications are **not yet implemented**.
- Coaching accounts are secured through email/password plus Supabase policies. An optional convenience PIN can be added later, but will never replace real authorization.
- Drill activity information is currently stored as JSON within a practice for quick, flexible sequencing. For detailed historical drill-use analytics, we should normalize it into `practice_activities` and `drill_use` tables in the next release.
- The published practice row is intentionally player-safe. Private coaching reflections live in `practice_notes`. Future sensitive evaluations must live in similarly separate private tables.
- Team attendance, video upload, game scouting, notifications, coach comment threads, and configurable benchmark thresholds are future capabilities.
- This package was browser-tested in demo mode. **Live Supabase authentication and RLS must be tested using your own project and test accounts before launch.**

## Architecture

- `index.html` + `styles.css` + `app.js`: responsive, dependency-free client.
- `config.js`: selected data mode and publicly shareable Supabase connection configuration.
- `public/assets`: the original SAS artwork extracted from the provided branding file.
- `supabase/migrations`: database tables and row-level access control.

No cloud services were created and no GitHub repository was modified on your behalf by this package.

# Publishing the studio on the web (Firebase Hosting)

**Live at https://manostudio-app.web.app** (the Hosting site `manostudio-app` in the Firebase project
`pictogen-daab2`), published by `.github/workflows/deploy-web.yml` on every push to `main`.
The project's first address, https://pictogen-daab2.web.app, is taken offline by the same
workflow once the new one is live.

- `/`: the welcome page (`public/index.html`): what Toonaro does, shown with pictures it draws
  live in the visitor's browser, and a "Try it" button. Share this link.
- `/studio`: the studio (`public/studio.html`). Old links to the studio (`/?text=...`) still open it.
- `/help`: how to use Toonaro, with examples that open in the studio.
- `/showcase`: the narrated show.

### The address

The address is a Hosting site's name: https://<site>.web.app. The workflow uses the repository
variable `FIREBASE_SITE` (default `manostudio-app`) in the project `FIREBASE_PROJECT_ID` (default
`pictogen-daab2`), and creates the site the first time. Site names are unique across all of
Firebase: if the name belongs to another project, the workflow keeps publishing to
https://pictogen-daab2.web.app and says why in the run's log.

- **The name is your own other Firebase project** (e.g. you created a project called
  `manostudio`): in that project, **Project settings → Service accounts → Generate new private
  key**; put the key in the repository secret `FIREBASE_SERVICE_ACCOUNT` (replacing the old one),
  and set the repository variable `FIREBASE_PROJECT_ID` to that project's ID. Then turn off the old
  address in the old project's console: **Hosting → (the pictogen-daab2 site) → ⋮ → Disable site**.
- **Another free name**: set the repository variable `FIREBASE_SITE` to it
  (**Settings → Secrets and variables → Actions → Variables**), then **Actions → Deploy web
  studio → Run workflow**.

Once the new address is live, the workflow takes https://pictogen-daab2.web.app offline (when its
key is allowed to).

## One-time setup (about 10 minutes, all in the browser)

1. **Create the Firebase project.** Open https://console.firebase.google.com, choose **Create a
   project**, name it *Toonaro*. Under the name, click the project ID and set it to `toonaro`
   (the site will be **https://toonaro.web.app**). If `toonaro` is taken, pick another, e.g.
   `toonaro-family`; the site is then `https://toonaro-family.web.app`. Google Analytics is not
   needed. The free plan is enough.
2. **Turn on Hosting.** In the project: **Build → Hosting → Get started**, and click through the
   steps (you don't need to run the commands it shows).
3. **Make a deploy key.** **Project settings (⚙) → Service accounts → Generate new private key**.
   A `.json` file downloads. It lets whoever has it change the project: keep it private, don't
   send it by chat or email.
4. **Give the key to GitHub.** In the repository on github.com: **Settings → Secrets and variables
   → Actions → New repository secret**. Name: `FIREBASE_SERVICE_ACCOUNT`; value: the whole content
   of the `.json` file. If your project ID is not `toonaro`, also open the **Variables** tab and
   add `FIREBASE_PROJECT_ID` with your project ID.
5. **Publish.** **Actions → Deploy web studio → Run workflow**. After a couple of minutes the site is
   live. From then on, every push to `main` publishes the latest version automatically
   (`.github/workflows/deploy-web.yml`).

From a computer instead: `npx firebase-tools login`, then `npm run deploy` (uses `.firebaserc`;
change the project ID there if it isn't `toonaro`).

## Who can see it

- Anyone with the link can open and use it; it is not listed by search engines (`noindex`,
  `robots.txt`).
- Nothing people make is uploaded: scenes are drawn in their browser, "Your characters" photos
  stay in their browser's storage, exports are made on their device.
- The showcase page's narration recordings are left out (their license is unclear, see
  `docs/LICENSE_AUDIT.md`); the showcase uses the browser's own voice instead.
- The licenses travel with the site: `/LICENSE.txt` and `/THIRD_PARTY_NOTICES.txt` (the Fluent
  Emoji icons' MIT notice, Kenney's CC0 sounds).

To limit it to invited people later, Firebase Authentication can put a sign-in (e.g. Google
accounts on an allow-list) in front of the studio.

## The public demo on toonaro.com (STRATO)

`npm run web:demo` builds the public demo into `dist-demo/`: the landing page, the help page, the
show and the studio, where every visitor can make **as many pictures and clips as they like**
(`DEMO_TRIES` in `scripts/build-web.js` is 0; a number there limits each visitor to that many), from short texts: a picture from up to 120 characters, a clip (or
"Notes → explainer") from up to 300 (`DEMO_MAX_PROMPT`, `DEMO_MAX_STORY`); a longer text is stopped
with a note. It costs nothing per visitor: everything is drawn in the visitor's
browser, the web space only sends the files (about 24 MB, once per visitor). No login: it would need
a server, consent texts and more privacy rules, for little gain. Everything the studio draws carries the mark "Toonaro · demo", on screen
and so in every download, print and video. A small note in the studio shows how to get the full
version, without the mark (the address in `DEMO_CONTACT`). **Only in the full version** (the demo build leaves them out or limits them; `window.__toonaroDemo`
in the studio, and the website's copy of `src/api.js` is cut by `scripts/build-web.js`): the whole
picture book (the demo: the cover, two pages and a page about the full version), a worksheet's answer
key (not even made on request), faces from photos, a clip as a web page (`/api/story/export-html`
is gone), HD video (the demo records 960x540, the full version 1280x720), long texts, no watermark,
installing and working offline. Note that everything on a website can be copied: the limits stop
visitors, the licence protects the product. Words Toonaro did not know are listed under the
picture, with a link that opens the visitor's own mail app with them filled in (nothing is sent by
itself, nothing is logged): the list of what to teach Toonaro next. (With a number of tries, they are counted
in the visitor's browser: a visitor who clears their browser data gets new ones.) The demo is a website: it can't be installed as an app, search engines may list it,
and `/impressum` and `/datenschutz` are linked at the bottom of the landing page.

Before the first upload:

1. Fill in the `[placeholders]` in `public/impressum.html` and `public/datenschutz.html` (the build
   warns while any are left), and have the privacy page checked.
2. Create the mailbox `info@toonaro.com` in the STRATO customer area (or change `DEMO_CONTACT`
   and the two pages).
3. In the STRATO customer area, sign the data processing agreement (*Auftragsverarbeitung, AVV*),
   which the privacy page mentions, and switch on SSL for toonaro.com.

To publish: `npm run web:demo`, then upload **everything inside** `dist-demo/` (including the
hidden `.htaccess`) to the web space folder `toonaro` by SFTP, e.g. with FileZilla: the server,
port and user name are under *Datenbanken und Webspace → SFTP & SSH* in the STRATO customer
area (an access whose start folder is `/`). The `.htaccess` makes
`/studio`, `/help`, `/impressum` and `/datenschutz` open their pages on STRATO's Apache servers.

### Publishing automatically (GitHub Actions)

`.github/workflows/deploy-strato.yml` builds the demo and uploads it to STRATO by SFTP on every push
to `main` that changes the website or the engine, and by hand (*Actions → Publish toonaro.com →
Run workflow*). One-time setup: save the SFTP access's password as the repository secret
**`STRATO_SFTP_PASSWORD`** (*Settings → Secrets and variables → Actions → New repository secret*).
The server and user name default to the access made for Toonaro; repository variables
`STRATO_SFTP_HOST` / `STRATO_SFTP_USER` change them. The site goes into the web space folder
`/toonaro`: STRATO points a domain at a folder, not at the main folder (*Domains → toonaro.com → ⚙ →
Umleitung einrichten → Intern → toonaro*).

## The full version and licences

The full app (`npm run web:build`) is unlocked with a licence key once your public key is in
`public/js/licence-key.js`; how to make keys: `docs/LICENCES.md` and `tools/licence-issuer.html`
(the issuer is not part of the website). The terms of use are `/nutzungsbedingungen`, linked from
the website's footer and the other legal pages.


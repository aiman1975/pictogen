# Publishing the studio on the web (Firebase Hosting)

**Live at https://manostudio-app.web.app** (the Hosting site `manostudio-app` in the Firebase project
`pictogen-daab2`), published by `.github/workflows/deploy-web.yml` on every push to `main`.
The project's first address, https://pictogen-daab2.web.app, is taken offline by the same
workflow once the new one is live.

- `/`: the welcome page (`public/index.html`): what PictoGen does, shown with pictures it draws
  live in the visitor's browser, and a "Try it" button. Share this link.
- `/studio`: the studio (`public/studio.html`). Old links to the studio (`/?text=...`) still open it.
- `/help`: how to use PictoGen, with examples that open in the studio.
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
   project**, name it *PictoGen*. Under the name, click the project ID and set it to `pictogen`
   (the site will be **https://pictogen.web.app**). If `pictogen` is taken, pick another, e.g.
   `pictogen-family`; the site is then `https://pictogen-family.web.app`. Google Analytics is not
   needed. The free plan is enough.
2. **Turn on Hosting.** In the project: **Build → Hosting → Get started**, and click through the
   steps (you don't need to run the commands it shows).
3. **Make a deploy key.** **Project settings (⚙) → Service accounts → Generate new private key**.
   A `.json` file downloads. It lets whoever has it change the project: keep it private, don't
   send it by chat or email.
4. **Give the key to GitHub.** In the repository on github.com: **Settings → Secrets and variables
   → Actions → New repository secret**. Name: `FIREBASE_SERVICE_ACCOUNT`; value: the whole content
   of the `.json` file. If your project ID is not `pictogen`, also open the **Variables** tab and
   add `FIREBASE_PROJECT_ID` with your project ID.
5. **Publish.** **Actions → Deploy web studio → Run workflow**. After a couple of minutes the site is
   live. From then on, every push to `main` publishes the latest version automatically
   (`.github/workflows/deploy-web.yml`).

From a computer instead: `npx firebase-tools login`, then `npm run deploy` (uses `.firebaserc`;
change the project ID there if it isn't `pictogen`).

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

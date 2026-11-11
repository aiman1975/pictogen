# Licences for the full version

The full app (`npm run web:build` → `dist/`, installable, offline) is unlocked with a **licence key**.
Without one it is the free version: the "demo" mark and short texts, like the website. Keys are
checked on the device (`src/licence.js`, ECDSA P-256): no server, no account, nothing sent anywhere.

## Once: your signing key

1. Open `tools/licence-issuer.html` on your own computer (double-click; Chrome, Edge or Firefox).
2. **Create my signing key**: it saves `toonaro-signing-key.json`. **Keep it private and backed up**
   (a USB stick). Whoever has it can make licence keys; if it is lost, new keys won't match the app
   already sold. Never send it to anyone.
3. Copy the **public key** it shows (not secret) into `public/js/licence-key.js`:
   `export const PUBLIC_KEY = { "kty": "EC", ... };` From then on the full app asks for a licence.

Until the public key is set, the full app is open as it always was.

## For each customer

1. Open the issuer, load `toonaro-signing-key.json`.
2. Fill in who it is for (person, school, company), the licence (Family, School, Business), seats
   and an end date if any.
3. **Create the licence key** and send it with the ready e-mail (German and English).

The customer clicks **🔑 Licence** in the app, pastes the key, **Unlock the full version**. It stays
on that device; **Remove the licence** takes it off. A key that ends (its date) turns the app back
into the free version, with a note why. Section 3 of the issuer checks what any key says and
whether it is genuine.

## What a key is

`TNR1.<the licence as base64url JSON>.<signature>` - the licence: who it is for, the type, seats,
issued and (optionally) until. Anyone can read it; only your signing key can make one that passes,
and changing any letter breaks it.

Like everything that runs on the customer's device, this stops honest mistakes and casual copying,
not a determined programmer: the licence agreement and the terms of use
(`public/nutzungsbedingungen.html`) are what protect Toonaro legally.

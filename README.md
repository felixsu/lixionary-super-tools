# Lixionary Super Tools

A collection of small developer utilities — encoding, cryptography and randomness — behind a tabbed single-page UI with ⌘K fuzzy search. See `docs/spec.md` for the product spec.

## Tools

- **Encoding/Decoding** — Base64 (URL-safe alphabet, UTF-8/Latin-1), URL percent-encoding
- **Cryptography** — HMAC generator (with Python/Node/Java snippets), JWT decode/verify/generate (HS256 & RS256), RSA key generator (PEM/OpenSSH) with RSA-OAEP encrypt/decrypt
- **Random** — Coin toss and dice roll simulators with live distribution histograms

All crypto runs client-side via the Web Crypto API; keys and secrets never leave the browser.

## Running

```bash
npm install
npm run dev
```

The app is fully usable without any configuration. Open tabs, tool inputs, histograms and (anonymous) favourites persist in the browser's localStorage.

## Running with Docker

```bash
docker compose up -d --build
```

This starts the app plus MongoDB (persisted in the `mongo-data` volume). The app is a single Next.js process serving both the UI and the API, published on two ports:

- http://localhost:8120 — frontend
- http://localhost:8121 — backend API (`/api/*`)

For Google sign-in, put `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in a `.env` file next to `docker-compose.yml` and use `http://localhost:8120/api/auth/callback/google` as the OAuth redirect URI.

## Optional: Google sign-in + favourites sync

Sign-in is Google SSO only. When configured, the backend stores the user and their favourite tool ids in MongoDB; favourites then follow the account across browsers (localStorage favourites are merged in on first sign-in).

1. Copy `.env.example` to `.env.local`
2. Set `MONGODB_URI` (local MongoDB or Atlas)
3. Generate `AUTH_SECRET` with `npx auth secret`
4. Create an OAuth client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (type: Web application, redirect URI `http://localhost:3000/api/auth/callback/google`) and set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`

## Stack

Next.js (App Router, TypeScript) · Auth.js v5 (Google provider, MongoDB adapter) · MongoDB · lucide-react icons · design system CSS ported from the Lixionary Claude Design project (no CSS framework).

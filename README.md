# Miami Tix

Ticket marketplace for music events, live at **[tixmiami.com](https://tixmiami.com)**. Fans browse events and request tickets from trusted sellers with zero fees.

TypeScript monorepo:
- `apps/web`: Next.js frontend (Netlify)
- `apps/api`: Express API with modular auth / events / listings domains, JWT + Google OAuth, MongoDB, Cloudinary image uploads (Fly.io)

## Quick start

1. Install dependencies:
   - `npm install`
2. Set env file for API:
   - `cp apps/api/.env.example apps/api/.env`
   - set a strong `JWT_SECRET`
   - set `MONGODB_URI` and `MONGODB_DB_NAME`
   - set `TRUSTED_SELLER_EMAILS` to approved seller emails
3. Run API:
   - `npm run dev:api`
4. Run web app:
   - `npm run dev:web`

## Validation

- Run API linting:
  - `npm run -w @ticket-splice/api lint`
- Run API smoke tests (auth + listings/events/account):
  - `JWT_SECRET=your_long_local_secret npm run -w @ticket-splice/api test`
- Run web lint/build:
  - `npm run -w web lint`
  - `npm run -w web build`

## Frontend API configuration

- Set `NEXT_PUBLIC_API_URL` in `apps/web/.env.local` if your API is not at `http://localhost:4000`.

## Production environment checklist

- API required env:
  - `NODE_ENV=production`
  - `API_PORT`
  - `JWT_SECRET`
  - `APP_WEB_URL`
  - `CORS_ORIGIN`
  - `MONGODB_URI`
  - `MONGODB_DB_NAME`
  - `TRUSTED_SELLER_EMAILS`
- Web required env:
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_SITE_URL` (optional) — public site URL used for link previews (Instagram, iMessage, etc.). Defaults to Netlify's `URL`; set it if you serve from a custom domain that isn't the Netlify primary domain.
  - Avoid adding backend secrets to Netlify web env vars.

## Auth configuration

- Email verification:
  - Configure SMTP settings in `apps/api/.env` for real email delivery.
  - Without SMTP, verification links are logged to the API console in development.
- Google OAuth (optional):
  - Configure `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI`.

## Current status

- Mongo-backed API with users, events, listings, purchase requests, purchases, and wishlists.
- Browse events only returns events with active listings.
- Simplified listing-first sell flow supports event create/reuse, market floor pricing, and seat types (`GA`, `VIP`, `OTHER`).
- Trusted seller allowlist controls who can create events/listings.
- Buyer flow is trust-based: logged-in buyers submit quantity + phone request and sellers follow up directly.
- Account page is data-backed with wishlisted, selling, sent requests, and incoming buyer requests.

# Email -> (fake verify) -> PayMongo checkout (single Next.js app)

## Setup
1. Create a Neon project and copy the connection string.
2. `cp .env.example .env.local` and fill in the values.
3. `npm i && npm run db:init && npm run dev`
4. Open http://localhost:3000

## Webhook (marks payments as paid)
Expose the app (e.g. `ngrok http 3000`), set `APP_URL` to the ngrok URL, then in
PayMongo Dashboard -> Developers -> Webhooks register
`https://<your-url>/api/webhooks/paymongo` for `checkout_session.payment.paid`.
Put the webhook secret in `PAYMONGO_WEBHOOK_SECRET`.

## Notes
- Email "verification" is fake by design.
- `PRODUCT_AMOUNT` is in centavos (29900 = PHP 299.00).
- Deploys to Vercel as-is: add the same env vars and set `APP_URL` to your domain.

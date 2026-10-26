# Project Guidelines

## Deferred: account-backed closet sync

Do not begin this work unless the user asks to resume it. The current closet is browser-local (`localStorage`); account sync is not implemented.

Agreed direction for the first release:

- Deploy the existing app on Vercel and use Supabase for authentication and Postgres data.
- Support email magic-link sign-in.
- Sync closet entries only. Do not save outfit-match history or photos in this first release.
- After sign-in, offer to merge the current browser's closet with the account closet.
- Keep the color-vision profile local unless the user later asks to sync it.

When resumed, the implementation will need to:

1. Add Supabase authentication to the app and configure Vercel and localhost redirect URLs.
2. Create user-owned closet storage with Row Level Security policies that restrict each account to its own entries.
3. Implement closet loading/saving and an explicit local-closet merge flow.
4. Adapt the Express API to Vercel's deployment runtime if required, keeping the Anthropic key server-side.
5. Test sign-in, merge behavior, closet persistence, and isolation between accounts.

Never put credentials in source control or chat. An API credential was exposed in the conversation context; revoke and replace it before deploying or configuring production.

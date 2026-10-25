# Legacy backend (reference only)

This is the original Cake Town Express server, kept so the history is easy to compare.
It is no longer used: the new API lives in `backend/`.

Issues fixed in the rewrite:

1. `cookie-parser` was registered after the router, so `req.cookies` was undefined and every protected route returned 401.
2. `/login` created and set the session cookie before checking the password.
3. The login cookie expired after 2 minutes.
4. `/About` and `/GetData` returned the full user document, including the password hash and tokens.
5. `/signup` and `/login` sent no response when an error was thrown, so requests hung.
6. `cpassword` was hashed and stored in the database.

Run `npm run migrate:users` once against your existing database to clean up old user records.

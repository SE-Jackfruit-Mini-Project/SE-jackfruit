# Backend

The API is an Express application backed by PostgreSQL through Prisma.

1. Copy `.env.example` to `.env` and set `DATABASE_URL` for a local PostgreSQL database.
2. Install dependencies with `npm install`.
3. Run `npm run db:generate` and `npm run db:migrate`.
4. Start the API with `npm run dev`.

Donor registration is available at `POST /api/v1/auth/register` with `fullName`, `email`, and `password` fields. Public registration always creates a `DONOR` account. Exact donor profile fields remain TBD in the approved requirements, so the initial account model stores only identity and authentication fields.

The donor profile API provides `GET /api/v1/donors/me` and `PUT /api/v1/donors/me`. The update endpoint currently accepts only `fullName`; it uses `request.user.id` and `request.user.role` from the authentication middleware. The login story must attach the verified user to the request before these endpoints can be used.

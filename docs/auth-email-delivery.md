# Auth Email Delivery

Phase 5.2F.1 keeps Supabase Auth confirmation email separate from the
application workflow email outbox.

## Confirmation Redirect

Public registration must send Supabase Auth a configured confirmation redirect:

```text
APP_BASE_URL/auth/callback?next=/app
```

`APP_BASE_URL` must be the trusted application origin for the environment. Do
not derive this URL from request `Host` headers.

## Supabase Auth SMTP

Configure Supabase Auth SMTP in the Supabase project settings or managed
secrets. Do not commit SMTP usernames, passwords, API keys, or bearer tokens.

ProjectMatch should use a verified transactional sender and domain for Auth
confirmation messages. If Resend is used for Auth SMTP, keep those credentials
and sender settings separate from the app-level Resend configuration used by
the `email_outbox` workflow/business email pipeline.

Required operational checks:

- Supabase Auth email confirmation remains enabled.
- Confirmation redirect URLs include the deployed `APP_BASE_URL` callback.
- Sender/from domain is verified before inviting users.
- Failed Auth email delivery is investigated before repeated retry campaigns.

## Welcome Email

Do not send a welcome email before email ownership is verified. A future
post-confirmation hook may send a welcome message after the callback has
successfully exchanged the confirmation code and established the account
session, but confirmation must not depend on that welcome email.

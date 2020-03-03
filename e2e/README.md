# E2E flow

- Create a cozy via Cloudery (or reuse an existing one, see below)
- Sets passphrase
- When setting the passphrase, the stack responds with a cookie that is kept
  for future logins

⚠️ Since the passphrase is not hashed properly before being sent to the Cozy),
we cannot login to the Cozy afterwards, this is not a real problem since 1)
the Cozy is temporary, 2) we already are logged into the Cozy after setting
the passphrase

- To create a usable token for ACH, we use the OAuth flow and reuse the
  session created after the passphrase is sent.

ℹ️  The cookie jar used for the session is saved, this means that if the test
suite is run locally, the Cozy will be reused.

ℹ️ The slug of the Cozy is random and in the form `test<adjective><name>`.

- Then the `ach` executable is used to `import`/`export`/`drop`and the output
  is compared to what is expected.

⚠️ E2E tests use a cloudery token accessed via environment variables. It can be
found in the password store. If this variable is not set, the e2e test suite will
be skipped.

```
export CLOUDERY_TOKEN=$(pass show cozy/e2e-front/manager-token | head -n 1)
```

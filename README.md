# Integrating With HubSpot I: Foundations Practicum

Educational Projects custom object integration, prepared for João Vitor Pereira using the official HubSpot Academy starter.

## Submission status

The application implementation and eight offline integration tests are complete. The developer test account, custom object configuration, live API verification, and Academy submission are not yet verified. Do not submit until the URL above has been replaced and the live checklist below has passed.

## Features and requirements

| Requirement | Implementation |
| --- | --- |
| Homepage GET route | `GET /` retrieves custom records with pagination |
| Form GET route | `GET /project-form` creates a blank form; `?id=` loads an existing record |
| Form POST route | `POST /project-form` creates via HubSpot POST or updates via PATCH, then redirects |
| New homepage Pug template | `views/homepage.pug` |
| Create/update Pug form | `views/project-form.pug` |
| Developer test-account URL | Pending authenticated setup |
| Revision history | Preserve original starter history and genuine implementation commits |

Custom object internal name: `educational_project`. Primary display property: `project_name`. Four required string/text properties: `project_name`, `project_type`, `target_audience`, `project_status`.

## Local setup

Requires Node.js 22 or later. From the repository directory:

```sh
npm ci
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`. Fill `.env` locally:

```text
HUBSPOT_ACCESS_TOKEN=<private app token from your developer TEST account>
HUBSPOT_OBJECT_TYPE=<real objectTypeId, for example 2-123456>
HUBSPOT_TEST_ACCOUNT_ID=<developer test account portal ID>
PORT=3000
```

Never commit `.env` or tokens. Start with `npm start`, then open http://localhost:3000. The application binds to localhost and is intended for this local practicum.

## Developer test account and schema setup

Use a HubSpot developer test account, not a normal or production account. Create a private app in that test account. The app needs `crm.objects.custom.read` and `crm.objects.custom.write`. The optional setup script additionally needs `crm.schemas.custom.read`, `crm.schemas.custom.write`, and permission to retrieve account details.

Either create the schema manually with the exact internal names above, or use the optional script:

```sh
# Only after confirming that the portal is your developer TEST account:
CONFIRM_DEVELOPER_TEST_ACCOUNT=yes npm run setup:hubspot
```

PowerShell:

```powershell
$env:CONFIRM_DEVELOPER_TEST_ACCOUNT="yes"
npm run setup:hubspot
```

The script verifies the token's portal ID matches `HUBSPOT_TEST_ACCOUNT_ID`, reuses a compatible existing schema, and writes only the non-secret object ID to `hubspot-object.json`. It does not seed, delete or modify existing records. The account ID check alone cannot prove the account is a developer test account; verify this in HubSpot before running setup. Put the returned objectTypeId into `.env`. Open the object's record list in HubSpot and copy the exact browser URL to the top of this README.

## Verification

```sh
npm test
```

Eight tests cover configuration, escaped homepage output and pagination, blank/edit forms, create, update, invalid inputs and cross-origin submissions, upstream authentication failures, and retained input after a rate-limit error. They use an injected API double and **do not demonstrate live HubSpot connectivity**.

Before submission:

- [ ] Confirm the account is a developer test account.
- [ ] Set the real objectTypeId and local private app token.
- [ ] Create “Reading Week” / “Literacy” / “Preschool” / “Planned” through the browser form.
- [ ] Confirm the record appears in the homepage and in HubSpot.
- [ ] Edit the status to “In progress”; confirm both locations reflect the change.
- [ ] Replace the pending custom-object URL above with the real browser URL.
- [ ] Check that no token is present in files or commit history.
- [ ] Review and understand the implementation before submitting; the official practicum requires your own work.
- [ ] Add the fork URL in HubSpot Academy's “Add link” field and submit.

## Development and attribution

Based on [HubSpot Academy's official starter](https://github.com/HubSpot-Academy/integrating-with-hubspot-i-foundations-practicum).

## API references

- [Custom objects and private apps](https://developers.hubspot.com/blog/how-to-build-a-custom-object-using-private-apps)
- [Custom object identifiers: base-name support removed](https://developers.hubspot.com/changelog/breaking-change-removed-support-for-referencing-custom-object-types-by-base-name)

Tokens are passed only in Authorization headers. Error responses and logs do not expose Axios configuration or upstream credential values. Runtime requests have a 15-second timeout. Form values are trimmed, required and limited to 200 characters. API errors render a recoverable response and preserve input on failed saves.


# Bharat Survey (Demo)

A single-page demo app showcasing a user dashboard for form management. Pure HTML/CSS/JS with localStorage for persistence.

## Features

- Forms
  - Create forms with fields (text, number, date, select)
  - Download forms (JSON, CSV, HTML)
  - Delete forms (single or bulk)
  - Select multiple forms and apply bulk actions
  - Archive/unarchive forms and view Archived tab
  - Share forms with email + permission (viewer/editor)
- Profile
  - View and edit user profile with real-time validation
- Auth (demo)
  - Sign up or log in to enter dashboard (no backend; session in localStorage)

## Getting Started

- Open `index.html` in a browser.
- Sign up to create your profile and you will be redirected to the dashboard.
- Use the Create Form tab to define forms; manage them in the Forms tab.
- Visit `tests.html` to run unit tests.

## Data Model

- localStorage keys:
  - `bs_user`: `{ name, email, phone, organization }`
  - `bs_forms`: `Array<Form>` where `Form` is `{ id, name, description, fields, createdAt, archived, sharedWith }`
  - `bs_session`: `{ email, loginAt }` or `null`

- `Form.fields`: `Array<Field>` where `Field` is `{ id, label, type, options? }`
- `Form.sharedWith`: `Array<{ email, permission }>`

## Unit Tests

- Open `tests.html` in a browser to run tests for core pure functions:
  - `addForm`, `deleteFormsByIds`, `setArchiveForIds`, `shareFormsWith`
  - `validateProfile`, `toCSV`, `toHTML`

## Notes

- This is a front-end demo; replace localStorage with real APIs for production.
- CSV export includes field metadata, not submissions.
- Sharing is simulated and purely client-side.

## License

MIT


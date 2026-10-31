# Brightloop Subscription Management Frontend

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Install dependencies

```bash
npm install
```

## Configure the API base URL

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the backend
base URL supplied by the backend team. The current app does not make API
requests.

## Run the development server

```bash
npm run dev
```

## Create a production build

```bash
npm run build
```

## Preview the production build

```bash
npm run preview
```

The current screens are routing and layout placeholders only; authentication
and business modules are not implemented.

## Visual system

Workspace and customer-portal design tokens live in [`src/index.css`](./src/index.css)
and are scoped to their layout roots. The dashboard and portal use the supplied
plum-lavender palette: deep plum (`#49225B`), plum (`#6E3482`), mauve
(`#A56ABD`), soft lavender (`#E7DBEF`), and pale lavender (`#F5EBFA`).
Success, warning, danger, and information colors use restrained semantic tints.
Authentication screens retain their existing styling and are not affected by
the workspace palette.

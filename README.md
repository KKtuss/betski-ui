# Betski UI

A static Vite build for the Betski UI.

### Prerequisites

- Node.js (v16 or higher)
- npm

## Run Locally

1. Install dependencies:
```bash
npm install
```

2. Start the local development server:
```bash
npm run dev
```

3. Open `http://localhost:5173`.

## Test Production Build Locally

1. Build the static files:
```bash
npm run build
```

2. Preview with Vite:
```bash
npm run preview
```

3. Or serve the built `dist` folder:
```bash
npm run serve
```

## Deploy On Vercel

1. Push the project to GitHub, GitLab, or Bitbucket.
2. In Vercel, create a new project and import the repository.
3. Use these settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. Deploy.

The included `vercel.json` uses `dist` as the static output directory and rewrites routes back to `index.html`.

## Build Output Structure

```bash
dist/
├── assets/
├── css/
├── js/
└── index.html
```

## Project Structure

```
index.html
package.json
vercel.json
public/
└── assets/
src/
├── components/
├── data/
├── hooks/
├── types/
├── utils/
├── App.tsx
├── index.css
└── main.tsx
vite.config.ts
```

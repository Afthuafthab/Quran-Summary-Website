# Sanity CMS setup for this project

This project already has a Sanity client configured in [src/lib/sanity.ts](src/lib/sanity.ts). The missing part is to create or connect your Sanity project and add the correct environment variables.

## 1) Create or open your Sanity project

1. Go to https://www.sanity.io/manage
2. Create a new project or open an existing one.
3. Copy these values:
   - Project ID
   - Dataset name (usually `production`)

## 2) Add the values to your local environment

Open [.env](.env) and make sure it contains:

```env
VITE_SANITY_PROJECT_ID=your_project_id
VITE_SANITY_DATASET=production
VITE_SANITY_API_VERSION=2025-07-01
```

You can also copy the expected format into [.env.example](.env.example).

## 3) Install the Sanity Studio packages

Run this in the project root:

```bash
npm install sanity @sanity/vision
```

## 4) Initialize Sanity Studio

Run:

```bash
npx sanity@latest init --create-project "Quran Summary" --dataset production --template clean --output-path studio
```

If you already have a project, choose the existing one when prompted.

## 5) Start the Studio

Run:

```bash
npx sanity dev
```

Open the local Studio URL shown in the terminal.

## 6) Create your first schema

In the Studio folder, you can create a simple document type such as `pageContent` or `quranSection`.

Example idea:

- `title`
- `slug`
- `body`
- `category`

## 7) Fetch content from your React app

You can use the existing client in [src/lib/sanity.ts](src/lib/sanity.ts) like this:

```ts
import { client } from './lib/sanity'

const data = await client.fetch(`*[_type == "pageContent"]{title, slug, body}`)
console.log(data)
```

## 8) Run the app

```bash
npm run dev
```

## Common beginner mistakes

- Using the wrong Project ID
- Using the wrong dataset name
- Forgetting to restart the app after changing [.env](.env)
- Trying to fetch data before the document exists in Sanity

If you want, the next step can be to wire one real page in this app to display Sanity content instead of the local JSON files.

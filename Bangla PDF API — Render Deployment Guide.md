# Bangla PDF API — Render Deployment Guide

এই project-টি Render-এ চালানোর জন্য **Docker Web Service** ব্যবহার করতে হবে। GitHub Pages ব্যবহার করলে backend PDF extraction, Poppler, Tesseract এবং `/api/trpc/pdf.extract` route কাজ করবে না।

## ১. GitHub repository প্রস্তুত করুন

Final source archive extract করে সব file একটি নতুন GitHub repository-তে push করুন। Repository root-এ অবশ্যই `Dockerfile`, `package.json`, `pnpm-lock.yaml`, `client/`, `server/`, `shared/` এবং `drizzle/` থাকবে। `.env`, secret key, `node_modules/`, `dist/` বা generated local files commit করবেন না।

```bash
git init
git add .
git commit -m "Deploy Bangla PDF API"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

## ২. Render service তৈরি করুন

Render Dashboard → **New +** → **Web Service** নির্বাচন করে GitHub repository connect করুন। Runtime হিসেবে **Docker** নির্বাচন করুন। Root Directory ফাঁকা রাখুন, Dockerfile path হিসেবে `Dockerfile` রাখুন, এবং এই settings ব্যবহার করুন:

| Setting | Value |
|---|---|
| Build Command | Dockerfile থেকে build হবে; আলাদা command প্রয়োজন নেই |
| Start Command | Dockerfile থেকে `node dist/index.js` চলবে |
| Health Check Path | `/` |
| Region | আপনার user-এর কাছের region |
| Instance Type | শুরুতে আপনার প্রয়োজন অনুযায়ী Web Service instance |

Dockerfile Poppler, Bengali Tesseract language data এবং Node production runtime install করে। তাই Render server-এ আলাদাভাবে `apt install` চালানোর প্রয়োজন নেই।

## ৩. Environment variables যোগ করুন

Render → Service → **Environment**-এ project-এর প্রয়োজনীয় values যোগ করুন। Secret values কখনো GitHub code-এ লিখবেন না। Manus-hosted version-এর values থাকলে সেগুলো ব্যবহার করুন; নতুন deployment-এর জন্য নিজের database/storage/auth configuration দিতে হবে।

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB database connection |
| `JWT_SECRET` | Session cookie signing |
| `VITE_APP_ID` | OAuth application ID |
| `OAUTH_SERVER_URL` | OAuth backend URL |
| `VITE_OAUTH_PORTAL_URL` | Login portal URL |
| `OWNER_OPEN_ID` | Owner identity |
| `OWNER_NAME` | Owner display name |
| `BUILT_IN_FORGE_API_URL` | Server-side storage/API gateway |
| `BUILT_IN_FORGE_API_KEY` | Server-side API credential |
| `VITE_FRONTEND_FORGE_API_URL` | Frontend API gateway URL |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend API credential |
| `VITE_ANALYTICS_ENDPOINT` | Optional analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | Optional analytics website ID |
| `VITE_APP_TITLE` | Website title |
| `VITE_APP_LOGO` | Optional logo value |

Render-এর **Environment Groups** ব্যবহার করলে একই variables staging ও production service-এ পুনরায় ব্যবহার করা যাবে।

## ৪. Deploy এবং test করুন

**Create Web Service** চাপলে Render Dockerfile build করে service deploy করবে। Deploy শেষ হলে Render একটি URL দেবে, যেমন:

```text
https://your-service-name.onrender.com
```

Browser-এ root URL খুলে frontend upload test করুন। API endpoint হবে:

```text
https://your-service-name.onrender.com/api/trpc/pdf.extract
```

এটি browser address bar-এ খুললে GET request হবে; API ব্যবহার করতে `POST` request পাঠাতে হবে। tRPC input সাধারণত `json` wrapper-এর মধ্যে পাঠানো হয়। Example:

```bash
curl -X POST \
  'https://your-service-name.onrender.com/api/trpc/pdf.extract' \
  -H 'content-type: application/json' \
  --data-binary @request.json
```

`request.json`-এর উদাহরণ:

```json
{
  "json": {
    "fileName": "NIAZ.pdf",
    "mimeType": "application/pdf",
    "contentBase64": "JVBERi0xLjQK..."
  }
}
```

বাস্তবে `contentBase64`-এ PDF file-এর সম্পূর্ণ Base64 value দিতে হবে। Website UI ব্যবহার করলে এই encoding স্বয়ংক্রিয়ভাবে তৈরি হয়।

## ৫. গুরুত্বপূর্ণ production notes

PDF upload limit 10 MB। Temporary processing files extraction শেষ হলে remove করা হয়। Portrait ও signature storage-এর জন্য S3-compatible storage ব্যবহার করা উচিত; Render local filesystem persistent নয়। Render service spin-down করলে প্রথম request-এ cold start হতে পারে।

Deploy-এর পরে অন্তত তিনটি sample দিয়ে পরীক্ষা করুন: NIAZ.pdf, 4198016687.pdf এবং ASMA.pdf। বিশেষভাবে যাচাই করবেন: `nameEnglish`-এ অতিরিক্ত `ES/RES` নেই, `গ্রাম/রাস্তা:`-এর priority ঠিক আছে, `Mouza/Moholla` label leakage নেই, এবং signature কালো block না হয়ে transparent PNG হিসেবে আসে।

## ৬. Troubleshooting

**Build-এ Poppler বা Tesseract error হলে:** Render service-এ Docker runtime নির্বাচিত হয়েছে কি না এবং repository root-এ `Dockerfile` আছে কি না যাচাই করুন।

**API 404 হলে:** URL-এর শেষে `/api/trpc/pdf.extract` ব্যবহার করুন এবং request method `POST` রাখুন।

**Database error হলে:** `DATABASE_URL` connection string, SSL requirement এবং Render outbound database access যাচাই করুন।

**Signature image না খুললে:** storage/API environment variables এবং generated `.png` URL যাচাই করুন; signature এখন `.jpg` নয়, `.png` হিসেবে তৈরি হয়।

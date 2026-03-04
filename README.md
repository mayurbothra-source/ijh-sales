# IJH Sales Dashboard

Indo Japan Horologicals — Internal Sales Force Dashboard

## Deploy on Netlify (Recommended)

1. Go to [netlify.com](https://netlify.com) and sign up for free
2. Click **"Add new site"** → **"Deploy manually"**
3. Drag and drop the entire `ijh-sales` folder onto the page
4. Done — your app is live in under a minute!

To set a custom domain: Site settings → Domain management → Add custom domain

## Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up for free
2. Click **"Add New Project"** → **"Import"**
3. Upload or connect this folder
4. Click Deploy

## Run Locally (for testing)

```bash
npm install
npm run dev
```
Then open http://localhost:5173

## Login Credentials

| Name | Role | Password |
|------|------|----------|
| Mayur Bothra | CEO | admin123 |
| Business Head | Business Head | ijh@1234 |
| Sales Exec 1–4 | Sales Exec | ijh@1234 |

*All non-CEO staff should change password on first login.*

## Notes

- Data is stored in browser localStorage (per device)
- No backend or database required
- Works on mobile browsers too

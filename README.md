# IJH Sales Dashboard

Indo Japan Horologicals — Internal Sales Force Dashboard

## Deploy on GitHub Pages

### One-time setup (do this once)

1. Push this repo to GitHub (repo name must be `ijh-sales`)
2. Go to your repo → **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. That's it — every push to `main` auto-deploys

Your app will be live at:
**https://YOUR-GITHUB-USERNAME.github.io/ijh-sales/**

### If your repo has a different name

Edit `vite.config.js` and change `/ijh-sales/` to `/your-repo-name/`

## Run Locally

```bash
npm install
npm run dev
```
Then open http://localhost:5173

## Login Credentials

| Name         | Role          | Password  |
|--------------|---------------|-----------|
| Mayur Bothra | CEO           | admin123  |
| Business Head| Business Head | ijh@1234  |
| Sales Exec   | Sales Exec    | ijh@1234  |

*All non-CEO staff should change password on first login.*

## Notes
- Data stored in browser localStorage (per device)
- No backend or database required
- Works on mobile browsers

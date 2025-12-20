CODED BY:PRINCE
# TeddyBot

A WhatsApp bot built with `whatsapp-web.js`.

## Repo setup (create & push to your GitHub)

1. Create a new repository on GitHub (private or public).
2. On your machine, in the project folder run:

```bash
git init
git add .
git commit -m "Initial commit"
# replace <your-repo-url> with the GitHub HTTPS/SSH url
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

Before pushing, remove or sanitize `settings.json` (it may contain your phone numbers). Instead, commit `settings.example.json` and ask users to copy it to `settings.json`.

## Make the project hostable

Files included to help deployments:

- `Procfile` - Heroku/Railway worker entry: `worker: node index.js`
- `Dockerfile` - container image for Docker-based hosts
- `ecosystem.config.js` - PM2 config for process managers/panel hosts
- `.gitignore` - excludes `node_modules`, `.local_auth`, `settings.json`, and `.env`

## Quick deploy guides

### Heroku

1. Install the Heroku CLI and login.
2. Create an app:

```bash
heroku create my-teddybot
heroku stack:set container # optional, default Node buildpack also works
```

3. Push to Heroku:

```bash
git push heroku main
heroku ps:scale worker=1
```

4. Set config vars (do **not** store sensitive data in `settings.json` if repo public):

```bash
heroku config:set OWNER_NUMBERS="+123..." PREFIX="." PUBLIC=true
```

### Railway / Render

- Railway: Create a new project, link your GitHub repo, and set the start command to `node index.js`.
- Render: Create a new "Background Worker" or "Web Service" and point to the repo. Build command `npm install` and Start command `node index.js`.

### Docker / Panels (Pterodactyl / other panels)

- Build locally: `docker build -t teddybot .`
- Run: `docker run -d --name teddybot teddybot`

For Pterodactyl or other panels that accept Docker images or a startup command, use the `ecosystem.config.js` with PM2 or run `node index.js` directly. Upload the repo or image and set the start command to `node index.js` or use PM2: `pm2 start ecosystem.config.js`.

## What to sanitize before publishing

- Remove your personal phone numbers from `settings.json` and instead provide `settings.example.json` with placeholders. Add `settings.json` to `.gitignore` (already done).
- Do not commit `.local_auth/` (session data), `.env` or any private keys.

## How to make it easy for users

- Instruct users to copy `settings.example.json` to `settings.json` and set their own `ownerNumber`/`ownerNumbers`.
- Optionally provide a small `setup.sh` or `setup.ps1` to copy and edit the example file.

## Troubleshooting & notes

- The bot requires a browser session (puppeteer) to connect. Some hosts block headless browsers—on those you will need to provide appropriate puppeteer args or use a compatible host.
- If deploying to Heroku, use worker dynos (no web port required). Keep an eye on dyno sleeping and session persistence.

---

If you want, I can:
- Remove personal numbers from the repository and add `settings.example.json` (done).
- Create a ready-to-push commit message and show the exact `git` commands with your repo URL.
- Generate a ZIP of the repo for easy download.

Which of these would you like next?

- 👋 Hi, I’m @princepaka885
- 👀 I’m interested in ...
- 🌱 I’m currently learning ...
- 💞️ I’m looking to collaborate on ...
- 📫 How to reach me ...
- 😄 Pronouns: ...
- ⚡ Fun fact: ...

<!---
princepaka885/princepaka885 is a ✨ special ✨ repository because its `README.md` (this file) appears on your GitHub profile.
You can click the Preview link to take a look at your changes.
--->


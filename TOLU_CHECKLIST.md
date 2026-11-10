# What you need to do (Tolu)

Deadline: **Thu Nov 12, 00:59 WAT** (Nov 11, 23:59 UTC). Aim to submit by Wed evening WAT. The total is about 2 to 3 hours.

| # | Step | Time |
|---|------|------|
| 1 | **Nimiq wallet.** Install Nimiq Pay on your phone (or use wallet.nimiq.com) and copy your NIM address. Prize payouts go there. Never share the recovery words with anyone. | 10 min |
| 2 | **GitHub.** Make a **public** repo named `stub`. Unzip `nimiq-miniapp.zip` and push everything *except* `node_modules`. In WSL: `cd stub && git init && git add . && git commit -m "Stub v1" && git branch -M main && git remote add origin https://github.com/<you>/stub.git && git push -u origin main` | 15 min |
| 3 | **Deploy.** On Netlify (free), go to "Add new site → Import from GitHub", pick `stub`, and it reads `netlify.toml` by itself. Or drag the `dist/` folder onto app.netlify.com/drop. Copy the https URL. | 10 min |
| 4 | **Test in Nimiq Pay.** Go to Mini Apps → Custom URL and paste your Netlify URL. Switch to Testnet first: long-press Settings for 10 s, pick Testnet, then tap "Get free NIM". Create an event with "Use my Nimiq Pay address", open its share link, buy 1 ticket, wait for "Confirmed", then go to Host → event → Check guests in and scan the ticket from a second phone (or paste the code). Tell me anything that breaks and I'll fix it. | 30–45 min |
| 5 | **Real usage (15 pts).** Do one real mainnet sale: make a tiny event (e.g. 10 NIM) and get 3 to 5 friends to buy a ticket. Every sale is on-chain proof of use. | 30–60 min |
| 6 | **Video walkthrough (required).** A 60 to 90 s screen recording on your phone: create event → share/poster → buy → ticket confirmed → door scan ADMIT → scan again ALREADY CHECKED IN → dashboard. Upload to YouTube (unlisted) or Loom. | 20 min |
| 7 | **Screenshots.** Retake 3 to 5 on your phone inside Nimiq Pay (mine are from demo mode). Use `submission-media/icon-512.png` and `thumbnail-240.png`. | 10 min |
| 8 | **Promotion (5 pts).** Post the X draft (3 pts) and the Skool post (2 pts) from `PROMO_DRAFTS.md`, and keep both URLs. | 10 min |
| 9 | **Submit.** Sign in with GitHub at https://miniappscompetition.com/submit and paste the fields from `SUBMISSION.md`. Category: **Pay**. Pricing: **Free**. | 10 min |

Optional: the last Sip & Ship live session is Wed Nov 11 at 16:00 UTC (5:00 PM WAT). It's a good place to demo it and get feedback.

## Things that are untested (check them in step 4)
- Opening the app and paying inside real Nimiq Pay (no phone was available while building).
- Whether the `https://nimpay.app/miniapps/open/...` deeplink keeps the `?e=` part. If it doesn't, share the plain web link instead (Manage → "Copy plain web link") and open it in Nimiq Pay.
- Camera scanning inside the Nimiq Pay WebView. If the camera is blocked, paste the ticket code instead (it's built in).
- USDT on Polygon with real funds (buyers need a little POL for gas).

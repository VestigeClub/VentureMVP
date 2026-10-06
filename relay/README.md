# Team assistant setup

The team assistant answers questions about a live plan and writes every question and answer to that plan's team log. The website can't hold an API key, so a small Cloudflare Worker (`worker.js`) holds it. Setup takes about 10 minutes and is done once.

You will end up with two links to send back: the **database link** and the **assistant link**. Never paste the API key or the database secret into chat; they only go into Cloudflare.

## 1. Firebase database rules and secret

1. In [console.firebase.google.com](https://console.firebase.google.com), open the `fairshare` project, then **Build → Realtime Database → Rules**.
2. Replace everything with the contents of [`firebase-rules.json`](firebase-rules.json) and click **Publish**. These rules let teammates post notes but never edit or delete log entries, and only the assistant can write questions and answers.
3. Copy the database link from the **Data** tab (looks like `https://fairshare-xxxxx-default-rtdb.firebaseio.com`).
4. Click the gear icon → **Project settings → Service accounts → Database secrets**. Click **Show** and copy the secret. Keep it for step 3.

## 2. Anthropic API key

1. Sign in at [console.anthropic.com](https://console.anthropic.com) and add a few dollars of credit under **Billing**.
2. Under **Settings → Limits**, set a monthly spend limit (for example $10).
3. Under **API keys**, click **Create key** and copy it. Keep it for step 3.

Each question costs about 2 cents. The relay also stops after 100 questions a day across all teams (change `DAILY_LIMIT` to adjust).

## 3. Cloudflare Worker

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) (free plan).
2. Go to **Workers & Pages → Create → Create Worker**, name it `fairshare-assistant`, and click **Deploy**.
3. Click **Edit code**, delete the sample, paste all of [`worker.js`](worker.js), and click **Deploy**.
4. Go back to the Worker → **Settings → Variables and Secrets** and add:
   - `ANTHROPIC_API_KEY`, type **Secret**: the key from step 2
   - `FIREBASE_SECRET`, type **Secret**: the database secret from step 1
   - `DB_URL`, type **Text**: the database link from step 1
5. Copy the Worker's link (looks like `https://fairshare-assistant.yourname.workers.dev`).

## 4. Switch it on

Set `DB_URL` and `AI_URL` at the top of the log section in [`sync.js`](../sync.js) to the two links, then merge. If `AI_URL` is empty, live plans still get the shared team log, just without the assistant.

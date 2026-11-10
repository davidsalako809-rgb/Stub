# Submission form: copy and paste

Form: https://miniappscompetition.com/submit (you sign in with GitHub). Deadline: **Wed Nov 11, 2026, 23:59 UTC = Thu Nov 12, 00:59 WAT**.

| Field | Value |
| --- | --- |
| App name * (≤80) | Stub |
| Category * | Pay |
| Tagline * (≤120) | Sell event tickets in NIM or USDT. Share one link, get paid wallet-to-wallet, scan guests in at the door. |
| Short description * (≤280 chars) | see below |
| Pricing * | Free |
| Repo URL * | https://github.com/<your-username>/stub |
| Demo URL * (live link) | https://<your-site>.netlify.app |
| Video walkthrough * (YouTube, Loom or Vimeo) | <your Loom/YouTube link> |
| E-mail * | <your email> |
| Team name | (leave blank, or "Tolu David") |
| X account | @toludavid29 |
| App icon * (512×512) | submission-media/icon-512.png |
| Thumbnail * (240×240) | submission-media/thumbnail-240.png |
| Screenshots * (3–5; the first is the social preview) | 03-event-page.png, 05-ticket-confirmed.png, 08-door-admit.png, 01-create-event.png, 02-manage.png (better: retake them on your phone inside Nimiq Pay) |
| Skool post URL (2 pts) | link to your post in the Mini Apps Skool community |
| Social post URL (3 pts) | link to your X post |
| How did you hear about it? | X |

## Short description (280 characters)

Stub lets anyone sell tickets in Nimiq Pay. Hosts create an event and share one link or poster. Guests pay in NIM or USDT straight to the host's wallet, and each ticket is a QR of the payment. At the door, Stub verifies it on-chain and admits each ticket once. No server, no fees.

## Builder story (optional, no limit shown)

I'm a graphic designer in Lagos. Most small events I go to sell tickets the same way: "send money to this account and DM me the screenshot". Then someone at the door scrolls through WhatsApp trying to match receipts. Fake screenshots get in, and the host spends the night on admin instead of the event.

Stub fixes that with what Nimiq Pay already does well: fast, cheap payments with a memo. The event is just a link. The payment is the ticket. The door check is one scan against the blockchain. Nobody holds the money but the host, and there's no server to trust or pay for. I designed it so the ticket feels worth showing off, and so a host can make the event, share a poster and start selling in under a minute.

## Longer description (if they ask for more; rules allow ≤250 words)

**Stub: event tickets paid with Nimiq Pay.** It's for small organizers (meetups, workshops, campus and church events, parties) who sell tickets by bank transfer and screenshots today.

**How it works.** A host creates an event: name, date, venue, price in NIM or USDT, capacity and a ticket theme, with a live preview. Stub packs it into a share link and a ready-made poster with a QR code. Guests open the link in Nimiq Pay, pick how many tickets, and pay with one native approval. The NIM payment carries an on-chain memo (`STUB:<event>:<qty>`), so the payment itself is the ticket. The guest gets a designed pass with a QR code that turns "Confirmed" once the payment is on-chain.

At the door, the host scans tickets. Stub checks the chain: the right recipient, the right event memo, enough paid, and confirmed. It shows ADMIT, ALREADY USED or DO NOT ADMIT. The dashboard shows tickets sold, NIM received and the guest list (with CSV export), read straight from the blockchain.

**Nimiq integration.** It uses `init()`, `sendBasicTransactionWithData`, `listAccounts`, `getBalance`, `getHostNetwork` (with testnet support), fullscreen, and `window.ethereum` for USDT on Polygon. There's no backend and no custody, and it's MIT open source.

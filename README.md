# Spring Leaf Navratri 2026 – Registration Page

```
spring-leaf-navratri/
├── index.html   (the website – HTML, CSS, JS in one file)
├── assets/      (poster-based images: hero.jpg, logo.png, footer.jpg, og.jpg)
├── Code.gs      (Google Apps Script – paste into your Google Sheet; NOT uploaded to Vercel)
└── README.md
```

## 1. Google Sheet + Apps Script (do this first)
1. Create a new Google Sheet, name it "Spring Leaf Navratri 2026".
2. Extensions → Apps Script.
3. Delete the sample code, paste all of `Code.gs`, click Save.
4. Select the function `setup` in the toolbar → Run → approve permissions
   (Advanced → Go to project (unsafe) → Allow). This creates Registrations, Volunteers, Dashboard.
5. Deploy → New deployment → gear icon → Web app.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy.
6. Copy the **Web app URL** (ends in `/exec`). This is the only URL the website needs.

If you later edit `Code.gs`: Deploy → Manage deployments → pencil → Version: New version → Deploy
(the URL stays the same).

## 2. Connect the page
Open `index.html`, find this near the top and paste your URL:
```js
const GOOGLE_APPS_SCRIPT_URL = "PASTE_YOUR_URL_HERE";
```

## 3. Test locally
Double-click `index.html` to open it in a browser, or run `npx serve` in the folder.
Submit a test registration and a test volunteer entry and check the sheet.

## 4. GitHub → Vercel
1. Create a GitHub repo `spring-leaf-navratri`, upload `index.html`, the whole `assets` folder and `README.md`
   (keep `Code.gs` out if you prefer; it is not needed by Vercel).
2. vercel.com → Add New → Project → Import the repo.
3. Framework preset: **Other**. Leave build command and output directory empty. Deploy.
4. Copy the live URL (`https://spring-leaf-navratri.vercel.app`) and share it on WhatsApp.

## Testing checklist
- [ ] Page loads on iPhone Safari, Android Chrome and inside WhatsApp, no sideways scrolling
- [ ] Both buttons open the right form; back arrow returns home
- [ ] Empty submit shows red errors and scrolls to the first one
- [ ] Mobile accepts `9876543210` and `+919876543210`, rejects `12345`
- [ ] Selecting each Day 1–9 shows the right extra fields; deselecting hides them
- [ ] Day 7–9: "Number of Participants" appears only for Group
- [ ] Multi-day registration creates one sheet row per day, same Registration ID
- [ ] Success screen shows the ID `SLN26-00001`; "Register Another Person" gives a clean form
- [ ] Double-tapping Submit creates only one row; retrying after a network drop does not duplicate
- [ ] Volunteer form works, "Selected Days" reveals Day 1–9 boxes
- [ ] Dashboard sheet numbers update

## Notes
- No Sheet ID, API key or credential is in the page; it only knows the Web App URL.
- Spam protection: hidden honeypot field, in-flight lock, duplicate-submission key, server-side validation.

## Optional: WhatsApp link preview
After Vercel gives you the live address, open `index.html`, find `YOUR-SITE.vercel.app` in the
`og:image` line near the top and replace it with your real address. WhatsApp will then show the poster
as the preview picture when the link is shared.

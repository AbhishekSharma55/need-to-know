# Need-to-Know

**Share the details a recipient asks for while keeping the original document on your device.**

Imagine you need to submit one receipt for both a work reimbursement and a warranty claim. Your employer’s checklist asks for the merchant, date, and total. The warranty form asks for the product, purchase date, and order number. Need-to-Know reads the receipt on your device, explains which fields each request calls for, and lets you review and export two different copies.

Google’s #BuildHybridAI 2026 entry uses **Android and desktop Chrome**. Firebase AI Logic runs Gemini Nano when reading a private image or matching fields locally. A separate cloud call interprets a public checklist or request text you explicitly approve for that call. Original photos, extracted values, and prepared copies stay local throughout preparation. You decide when and where to send the export.

## Project documents

- [Grand Prize strategy](RESEARCH.md#grand-prize-strategy) explains what makes this entry competitive, what evidence judges should see, and which results would weaken the case.
- [RESEARCH.md](RESEARCH.md) covers the official rubric, competing products, Firebase capabilities, and the assumptions we need to test.
- [BUILD_PLAN.md](BUILD_PLAN.md) covers the demo, data flow, team ownership, verification, and submission package.

## What we want to prove

People can satisfy a recipient’s request while disclosing fewer extra fields than they do with a fixed redaction template. The demo shows the same receipt responding to two requests, what gets sent for cloud inference, and what the recipient would receive. The evidence comes from the actual request payload, the actual export, and a comparison against OCR and fixed templates.

## Run the Chrome workspace

Use Node.js 24 and desktop Chrome. From the repository root:

```sh
npm --prefix web ci
npm --prefix web run dev
```

Open the local URL shown by Vite. Switch between **Work reimbursement** and **Warranty request** to compare the same synthetic receipt. **Your own request** accepts manual field selection or an approved Gemini prompt. **Import receipt** opens a JPEG or PNG locally. The editable preview downloads a new HTML summary. The sample and manual workflows run with the page open offline and require no Firebase configuration.

### Enable live Firebase AI Logic

Register the web app in the team’s Firebase project, enable Firebase AI Logic with the Gemini Developer API, and register App Check using reCAPTCHA Enterprise. Put the web configuration and reCAPTCHA site key in an ignored `web/.env.local` file and restart Vite. [Firebase AI Logic setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started) · [Firebase AI Logic App Check](https://firebase.google.com/docs/ai-logic/app-check)

```dotenv
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_web_app_id
VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=your_recaptcha_enterprise_site_key
VITE_CLOUD_MODEL=gemini-3.5-flash-lite
```

For local cloud testing, set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` in Chrome DevTools before the first cloud call. Register the generated token in the Firebase console and keep it private. For on-device inference, choose **Prepare local model** in supported desktop Chrome, wait for it to be ready, and choose **Read with Gemini Nano**. For cloud inference, open the checklist controls, choose **Review cloud request**, check the prompt, and choose **Send to Gemini**. [App Check localhost setup](https://firebase.google.com/docs/app-check/web/debug-provider) · [Chrome on-device requirements](https://developer.chrome.com/docs/ai/prompt-api)

### Run checks

```sh
npm --prefix web run build
npm --prefix web test
npm --prefix web run benchmark
```

The benchmark compares a fixed template with the checked-in sample checklists using pre-transcribed synthetic values. It measures field selection. Model accuracy and recipient acceptance require separate trials.

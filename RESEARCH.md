# Hackathon research and findings

Sources checked November 28, 2026. The project recommendation targets the Grand Prize and the applicable platform awards. Product scope is based on judging fit and user value.

## What Google is asking teams to demonstrate

Google’s stated challenge is to build an app that runs generative AI on-device and in the cloud with Firebase AI Logic. Local inference can respond offline after the model is available and keep input on the device. Cloud inference extends coverage to devices without a local model and can handle requests that exceed local capabilities. Google explicitly gives multiplatform projects strong consideration for the Grand Prize. The $30,000 pool includes a $10,000 Grand Prize, $7,000 and $4,000 runner-up awards, and $3,000 each for Best Android, Best iOS, and Best Web/Chrome. The rules allow one entry to win the Grand Prize and up to one platform prize. [Hackathon overview](https://firebasehybridaihackathon.devpost.com/) · [Official rules](https://firebasehybridaihackathon.devpost.com/rules)

**Strategic inference.** Need-to-Know gives each inference path a different input. The cloud interprets a recipient’s public checklist or user-approved request text. On-device AI reads the private document and applies the checklist to the fields it finds. This lets the app demonstrate exactly what the model receives and what the recipient will eventually see.

## How judging works

Stage one is a pass/fail screen for viability and the submission requirements. Stage two averages four equally weighted scores on a 1–5 scale. Ties are broken in the order below, beginning with Technical Implementation. Judges may evaluate the entry from the written and visual materials alone. [Official rules, section 8](https://firebasehybridaihackathon.devpost.com/rules)

| Criterion | What earns the score in this project |
| --- | --- |
| Technical Implementation | Run Firebase AI Logic on a fresh receipt in airplane mode. Run a separate grounded cloud request on approved checklist text and show the actual payload. Inspect the exported artifact for extra fields. |
| Design | Make the original, the recipient’s request, the suggested fields, and the shareable result easy to compare. Show why a field was selected and give the user the final choice. |
| Potential Impact | Measure excess fields shared, required fields omitted, and preparation time against OCR and fixed templates. Ask recipients whether the output is usable for the stated request. |
| Quality of the Idea | Use one document to answer two different requests and show each selection’s source. The same workflow can serve reimbursements, warranty requests, or other everyday paperwork. |

In Google’s 2025 Chrome Built-in AI Challenge, *Trail* won in the hybrid category with an offline trail companion. Google’s write-up emphasized that hybrid winners gave users a clear reason for using both client and server capabilities. The 2026 gallery was unpublished when checked, so this research cannot establish overlap with other entries or estimate award odds. [2025 Chrome AI winners](https://developer.chrome.com/blog/ai-challenge-winners-2025) · [2026 project gallery](https://firebasehybridaihackathon.devpost.com/project-gallery)

## Grand Prize strategy

**Make the judge see one private document produce two useful exports, and prove what the cloud received.** The aim is to show that people can fulfill different requests without disclosing extra details. Android captures the receipt and prepares a copy offline. Chrome starts from a recipient’s checklist and prepares a copy from a local import. Both use the same rules for field selection and export. The contest favors multiplatform entries for Grand Prize consideration, and Technical Implementation is the first tiebreaker among the four equally weighted criteria. [Hackathon overview](https://firebasehybridaihackathon.devpost.com/) · [Official judging rules](https://firebasehybridaihackathon.devpost.com/rules)

1. **Show the hybrid architecture in the first demo sequence.** Open with the same receipt and the two requests. Use an approved checklist with a real distinction to interpret, such as a warranty form that asks for an order reference and rejects the payment authorization code. Show the live cloud call and the exact checklist payload it receives. Turn on airplane mode, capture a fresh receipt with both numbers on it, and show the SDK’s on-device inference source. Put the two finished exports side by side. Use synthetic marker values to verify the receipt and its extracted values stayed out of app-controlled network requests. [Organizer demo guidance](https://firebasehybridaihackathon.devpost.com/updates) · [Firebase Android inference modes](https://firebase.google.com/docs/ai-logic/hybrid/android/configuration-options)
2. **Show where each model earns its place.** Run the same cases with OCR and fixed templates. Then run the local workflow with a person manually converting the checklist into fields. The first comparison tests whether request-aware selection improves the exported result. The second isolates whether cloud interpretation helps on unfamiliar wording or conditional rules. Include competing values, a straightforward request, and an ambiguous request that should lead to a question. If fixed templates routinely do as well, improve the workflow or drop the stronger originality claim.
3. **Earn the impact claim with recipient review.** Use consented or public checklists, record which fields are required, and ask reviewers who handle reimbursements or warranty claims whether each export would be usable. Compare extra fields disclosed, required fields missing, time to complete, and acceptance rates across the same cases. Report the sample size and failed cases. If recipients need a different format, use that feedback to revise the export or narrow the demonstrated requests.
4. **Make verification easy for judges.** Lead with the receipt workflow in the public video, show both platforms, and give judges a hosted synthetic case, Android test build, and short reproduction steps. Include App Check, the runtime Firebase AI Logic calls, and the open-source license. Let judges inspect the two reference checklists and expected fields so they can verify the result themselves. [Official submission rules](https://firebasehybridaihackathon.devpost.com/rules)

Prioritize the evidence above over more document types, a disclosure ledger, or a third platform. The two weaknesses most likely to cost points are a cloud step that adds little beyond a template and an export that recipients won’t accept. Test those first. A numeric win probability would require evidence about the competing entries and how judges score them. The rubric helps decide where to invest and what to prove.

## Why this project

This project keeps the demo focused while giving it a use beyond a single profession. Asking “what should I send?” comes up in reimbursements, warranty claims, rental paperwork, and job onboarding. Start with explicit reimbursement and warranty checklists. They give us a concrete standard for judging each proposed field and a way to test whether people would use the same workflow for different requests.

A recipient’s own checklist is the strongest evidence of what it asks for. A public guide can provide context when the source is clearly identified. If the request is incomplete or conflicting, the app should explain the gap and let the user confirm it with the recipient. Recipient acceptance of the generated copy remains a product assumption.

## Competitors and differentiation

| Existing product | Overlap |
| --- | --- |
| [CoverID Redact](https://coverid.app/) | Redaction and purpose watermarks for documents such as identification. |
| [Adobe Acrobat AI Assistant](https://helpx.adobe.com/acrobat/desktop/use-acrobat-ai/generative-ai-features/ai-get-answers.html) | Answers questions about documents and cites source content. Acrobat also offers separate redaction and sanitization tools. |
| [DisputePacket](https://www.disputepacket.com/) | Prepares refund and chargeback evidence packets. |

The proposed differentiator is **selection based on the recipient’s request**. Given the same source document, the app explains and exports different fields for different recipients. A fixed template and OCR may handle straightforward cases, so compare against that baseline on requests with different wording, exceptions, and missing information. The review should measure both over-sharing and omissions.

## Technical findings

- Android supports a text prompt with one bitmap on supported devices. On-device mode is foreground-only and constrained by the model’s context and app quotas. Use `ONLY_ON_DEVICE` for private input, preload the model, and verify the active Gemini Nano version on the demo handset. If Nano is unavailable, allow local manual selection and use OCR where it is available. [Android setup](https://firebase.google.com/docs/ai-logic/hybrid/android/get-started) · [Android inference modes](https://firebase.google.com/docs/ai-logic/hybrid/android/configuration-options) · [Supported devices](https://developers.google.com/ml-kit/genai/#custom-generation-and-agent-device-support)
- Supported desktop Chrome configurations can run Firebase AI Logic with the browser’s local model. Chrome manages model availability and download. Private input uses `ONLY_ON_DEVICE` on Chrome as well. The initial web workflow uses an explicit import and review page. Upload-dialog integration is a separate assumption. [Web setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started) · [Web inference modes](https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options) · [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api)
- Firebase AI Logic offers Search grounding for supported cloud models. Use a separate cloud call on approved request context and retain citations. Search results supply references, while the product still needs to distinguish cited facts, recipient requirements, and unresolved questions. Check model availability and the documented requirements for displaying grounded results on the chosen backend. [Firebase Search grounding](https://firebase.google.com/docs/ai-logic/grounding-google-search)
- A cloud audit of a masked file would receive any values the masking missed. Perform document inspection locally. The first export is a new summary rendered from approved field values. If a later feature exports a redacted copy, verify hidden layers, embedded objects, and metadata as well as visible pixels. [Adobe PDF sanitization guidance](https://helpx.adobe.com/acrobat/desktop/protect-documents/redact-pdfs/sanitize.html)
- App Check is required for Firebase AI Logic. The contest accepts debug tokens. Use the appropriate attestation provider for a public deployment and keep debug tokens and personal documents out of the repository and submission materials. [Official rules](https://firebasehybridaihackathon.devpost.com/rules) · [Firebase production checklist](https://firebase.google.com/docs/ai-logic/production-checklist)

## Submission requirements

- Use Firebase AI Logic for runtime AI inference. The contest identifies Gemini Nano 4 for Android and Web/Chrome and Apple Foundation Models for iOS. Select all implemented platforms in the entry. AI coding assistants are allowed. [Hackathon requirements](https://firebasehybridaihackathon.devpost.com/#requirements)
- Add both eligible teammates to the Devpost project and designate one representative. Use original work and authorized third-party assets or data. Disclose pre-existing work as required and describe the changes made during the submission period if entering an existing app. [Official rules](https://firebasehybridaihackathon.devpost.com/rules)
- Provide a public GitHub or GitLab repo with an open-source license file, the source and assets needed to run it, setup instructions, and the actual Firebase AI Logic call. Keep personally identifiable information and production secrets out of the submission. [Official rules](https://firebasehybridaihackathon.devpost.com/rules)
- Provide English submission materials and a public YouTube video with English narration or subtitles. Show the real product on both entered platforms and keep the video within three minutes. Include the product’s value, features, and use of Firebase AI Logic in the written description. [Official rules](https://firebasehybridaihackathon.devpost.com/rules)
- Make the project available for free judging and testing. Provide a hosted synthetic example and an Android test build with clear steps for reproducing both paths. The event strongly encourages a hosted link. [Official rules](https://firebasehybridaihackathon.devpost.com/rules) · [Organizer updates](https://firebasehybridaihackathon.devpost.com/updates)

## Organizer resources

- [Firebase team build session with Cynthia Jiang](https://youtu.be/lEsZMYkftiU)
- [Firebase AI Logic hybrid inference overview](https://firebase.google.com/docs/ai-logic/hybrid)
- [Firebase guide to hybrid prompting in Chrome](https://developer.chrome.com/docs/ai/firebase-ai-logic)
- [Firebase Agent Skills for coding assistants](https://firebase.google.com/docs/ai-assistance/agent-skills)

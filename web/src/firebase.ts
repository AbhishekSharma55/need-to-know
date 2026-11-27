import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
  Schema,
} from 'firebase/ai';
import { getApps, initializeApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  cloudPrompt,
  fieldLabels,
  parseChecklist,
  parseSuggestions,
  receiptPrompt,
} from './workspace.ts';
import type { Checklist, ChecklistContext } from './workspace.ts';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
const enterpriseSiteKey = env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
const localAppCheckDebug = env.DEV && env.VITE_APPCHECK_LOCAL_DEBUG === 'true';
const checklistSchema = Schema.object({
  properties: {
    title: Schema.string(),
    items: Schema.array({ items: Schema.object({
      properties: {
        field: Schema.enumString({ enum: Object.keys(fieldLabels) }),
        evidence: Schema.string({ description: 'An exact excerpt of the recipient’s request' }),
        note: Schema.string(),
      },
    }) }),
    questions: Schema.array({ items: Schema.string() }),
  },
});

export const localConfigured = Boolean(config.apiKey && config.projectId && config.appId);
export const cloudConfigured = localConfigured && Boolean(enterpriseSiteKey || localAppCheckDebug);

function cloudAppCheckProvider() {
  if (enterpriseSiteKey) return new ReCaptchaEnterpriseProvider(enterpriseSiteKey);

  const debugToken = (globalThis as typeof globalThis & {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean;
  }).FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (!localAppCheckDebug || !debugToken) {
    throw new Error('Set up the local App Check debug token before calling Gemini.');
  }

  // The Firebase SDK handles the actual debug token exchange before calling this provider.
  return new CustomProvider({
    async getToken() { throw new Error('Firebase App Check debug mode is inactive.'); },
  });
}

function getService(kind: 'receipt' | 'checklist') {
  if (!localConfigured) throw new Error('The Firebase web app configuration is missing.');
  if (kind === 'checklist' && !cloudConfigured) throw new Error('Firebase App Check is required for cloud AI.');

  const name = `need-to-know-${kind}`;
  const existing = getApps().find(app => app.name === name);
  const provider = kind === 'checklist' && !existing ? cloudAppCheckProvider() : undefined;
  const app = existing ?? initializeApp(config, name);
  if (provider) {
    initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  }
  return getAI(app, { backend: new GoogleAIBackend() });
}

function receiptModel() {
  return getGenerativeModel(getService('receipt'), {
    mode: InferenceMode.ONLY_ON_DEVICE,
  });
}

export async function prepareLocalModel(onProgress: (progress: number) => void) {
  await receiptModel().initializeDeviceModel(onProgress);
}

async function toBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

export async function readReceipt(image: Blob, checklist: Checklist) {
  if (image.type !== 'image/png' && image.type !== 'image/jpeg') {
    throw new Error('Choose a JPEG or PNG receipt.');
  }
  const model = receiptModel();
  const encoded = await toBase64(image);
  const { response } = await model.generateContent([
    receiptPrompt(checklist),
    { type: 'inlineData', inlineData: { mimeType: image.type, data: encoded } },
  ]);
  if (response.inferenceSource !== InferenceSource.ON_DEVICE) {
    throw new Error('The SDK did not confirm local inference.');
  }
  return { suggestions: parseSuggestions(response.text(), checklist), source: response.inferenceSource };
}

export async function analyzeChecklist(context: ChecklistContext) {
  const grounded = context.kind === 'public';
  const model = getGenerativeModel(getService('checklist'), {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model: env.VITE_CLOUD_MODEL || 'gemini-3.5-flash-lite',
      generationConfig: {
        maxOutputTokens: 1600,
        ...(!grounded && { responseMimeType: 'application/json', responseSchema: checklistSchema }),
      },
      ...(grounded && { tools: [{ googleSearch: {} }] }),
    },
  });
  const prompt = cloudPrompt(context);
  const { response } = await model.generateContent(prompt);
  if (response.inferenceSource !== InferenceSource.IN_CLOUD) {
    throw new Error('The SDK did not confirm cloud inference.');
  }

  const metadata = response.candidates?.[0]?.groundingMetadata;
  const sources = (metadata?.groundingChunks ?? []).flatMap(({ web }) => {
    const url = web?.uri;
    if (!url?.startsWith('https://')) return [];
    return [{ url, title: web?.title || url }];
  });
  if (grounded && sources.length === 0) {
    throw new Error('No public source was found. Try pasting the checklist text instead.');
  }

  return {
    checklist: parseChecklist(response.text(), context),
    source: response.inferenceSource,
    sources,
    suggestionsHtml: metadata?.searchEntryPoint?.renderedContent,
    prompt,
  };
}

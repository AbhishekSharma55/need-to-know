import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
} from 'firebase/ai';
import { getApps, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  cloudPrompt,
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

export const localConfigured = Boolean(config.apiKey && config.projectId && config.appId);
export const cloudConfigured = localConfigured && Boolean(env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY);

function getService(kind: 'receipt' | 'checklist') {
  if (!localConfigured) throw new Error('The Firebase web app configuration is missing.');
  if (kind === 'checklist' && !cloudConfigured) throw new Error('Firebase App Check is required for cloud AI.');

  const name = `need-to-know-${kind}`;
  const existing = getApps().find(app => app.name === name);
  const app = existing ?? initializeApp(config, name);
  if (kind === 'checklist' && !existing) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY),
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
        ...(!grounded && { responseMimeType: 'application/json' }),
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

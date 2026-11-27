import { compareFields } from './workspace.ts';
import type { Field, FieldValues } from './workspace.ts';

export const fixedTemplates = {
  generic: ['merchant', 'purchaseDate', 'total'],
  reimbursement: ['merchant', 'purchaseDate', 'total'],
  warranty: ['product', 'purchaseDate', 'orderNumber'],
} as const satisfies Record<string, readonly Field[]>;

const receiptLabels: Record<Field, string> = {
  merchant: 'merchant|store|retailer|sold by',
  purchaseDate: 'purchase date|transaction date|receipt date|date',
  product: 'product|item|description',
  subtotal: 'subtotal|sub total|sub-total',
  total: 'final total|total paid|amount paid|grand total|total',
  orderNumber: 'order number|order reference|order #|purchase ref',
  name: 'customer name|customer|name',
  address: 'address',
  paymentDigits: 'card ending',
  paymentReference: 'payment reference|payment ref|authorization|auth code',
};

const matchers = (Object.entries(receiptLabels) as [Field, string][]).map(([field, labels]) => ({
  field,
  pattern: new RegExp(`^(?:${labels})\\s*:\\s*(.+)$`, 'i'),
}));

export function parseReceiptText(text: string): FieldValues {
  const values: FieldValues = {};
  for (const line of text.split(/\r?\n/)) {
    for (const { field, pattern } of matchers) {
      const match = line.trim().match(pattern);
      if (match && !values[field]) values[field] = match[1].trim();
    }
  }
  return values;
}

export function selectFields(values: FieldValues, template: readonly Field[]): FieldValues {
  const selected: FieldValues = {};
  for (const field of template) {
    const value = values[field]?.trim();
    if (value) selected[field] = value;
  }
  return selected;
}

function normalized(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function scoreExport(actual: FieldValues, reference: FieldValues, expected: readonly Field[]) {
  const { extra, missing } = compareFields(Object.keys(actual) as Field[], expected);
  const incorrect = expected.filter(field => {
    const value = actual[field];
    const target = reference[field];
    return value && target && normalized(value) !== normalized(target);
  });
  return { extra, missing, incorrect };
}

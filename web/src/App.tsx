import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  analyzeChecklist,
  cloudConfigured,
  localConfigured,
  prepareLocalModel,
  readReceipt,
} from './firebase.ts';
import { processImage, receiptSections, sampleImage } from './receipt.ts';
import {
  cloudPrompt,
  createContext,
  demoChecklists,
  demoReceipt,
  demoRequests,
  exportHtml,
  exportRows,
  fieldLabels,
} from './workspace.ts';
import type { Checklist, ChecklistContext, Field, FieldValues, Suggestions } from './workspace.ts';

type Sample = keyof typeof demoChecklists;
type HistoryEntry = { id: string; title: string; fields: string[]; at: string };
type CloudResult = Awaited<ReturnType<typeof analyzeChecklist>>;
type FieldOrigin = 'Sample data' | 'On device · Firebase AI Logic' | 'Manual review';

const historyKey = 'ntk-disclosure-history';
const fields = Object.keys(fieldLabels) as Field[];

function savedHistory(): HistoryEntry[] {
  try {
    const items: unknown = JSON.parse(localStorage.getItem(historyKey) ?? '[]');
    if (!Array.isArray(items)) return [];
    return items.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string' &&
      typeof item.at === 'string' && !Number.isNaN(Date.parse(item.at)) && Array.isArray(item.fields) &&
      item.fields.every((field: unknown) => typeof field === 'string'));
  } catch {
    return [];
  }
}

function fieldToggle(current: Field[], field: Field): Field[] {
  return current.includes(field) ? current.filter(item => item !== field) : [...current, field];
}

function Notice({ children }: { children: string }) {
  return <p className="notice" role="status">{children}</p>;
}

function SampleReceipt({ active }: { active?: Field }) {
  return (
    <article className="receipt" aria-label="Synthetic sample receipt">
      <div className={`receipt-heading ${active === 'merchant' ? 'evidence-highlight' : ''}`}>
        <strong>{demoReceipt.merchant}</strong>
        <span>Purchase receipt</span>
      </div>
      {receiptSections.map(section => (
        <dl className="receipt-section" key={section[0]}>
          {section.map(field => (
            <div className={`receipt-line ${active === field ? 'evidence-highlight' : ''}`} key={field}>
              <dt>{fieldLabels[field]}</dt>
              <dd>{demoReceipt[field]}</dd>
            </div>
          ))}
        </dl>
      ))}
      <span className="receipt-footer">Synthetic demo document</span>
    </article>
  );
}

export function App() {
  const [tab, setTab] = useState<'workspace' | 'history'>('workspace');
  const [choice, setChoice] = useState<Sample | 'custom'>('reimbursement');
  const [checklist, setChecklist] = useState<Checklist>(demoChecklists.reimbursement);
  const [checklistSource, setChecklistSource] = useState('Sample checklist');
  const [requestKind, setRequestKind] = useState<ChecklistContext['kind']>('request');
  const [requestText, setRequestText] = useState(demoRequests.reimbursement);
  const [pendingContext, setPendingContext] = useState<ChecklistContext>();
  const [cloudResult, setCloudResult] = useState<CloudResult>();
  const [manualFields, setManualFields] = useState<Field[]>([]);
  const [receipt, setReceipt] = useState<{ image: Blob; name: string }>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [values, setValues] = useState<FieldValues>({ ...demoReceipt });
  const [suggestions, setSuggestions] = useState<Suggestions>({});
  const [selected, setSelected] = useState<Field[]>(demoChecklists.reimbursement.items.map(item => item.field));
  const [active, setActive] = useState<Field>('merchant');
  const [origin, setOrigin] = useState<FieldOrigin>('Sample data');
  const [busy, setBusy] = useState<string>();
  const [modelStatus, setModelStatus] = useState(localConfigured ? 'Local model is ready to set up' : 'Firebase setup required');
  const [message, setMessage] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [receiptMessage, setReceiptMessage] = useState('');
  const [history, setHistory] = useState(savedHistory);
  const [remember, setRemember] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rows = exportRows(checklist, values, selected);
  const missing = checklist.items.filter(({ field }) => !rows.some(row => row.field === field));
  const editable = checklist.items.length > 0;

  useEffect(() => {
    if (!receipt) {
      setPreviewUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(receipt.image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [receipt]);

  function applyChecklist(next: Checklist, source: string) {
    setChecklist(next);
    setChecklistSource(source);
    setSelected(next.items.map(item => item.field));
    if (next.items[0]) setActive(next.items[0].field);
    setSuggestions({});
  }

  function chooseRequest(next: Sample | 'custom') {
    setChoice(next);
    setPendingContext(undefined);
    setCloudResult(undefined);
    setRequestMessage('');
    setRequestKind('request');
    setRequestText(next === 'custom' ? '' : demoRequests[next]);
    if (next !== 'custom') applyChecklist(demoChecklists[next], 'Sample checklist');
  }

  function reviewContext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestMessage('');
    setCloudResult(undefined);
    setPendingContext(undefined);
    try {
      setPendingContext(createContext(requestKind, requestText));
    } catch (error) {
      setRequestMessage(error instanceof Error ? error.message : 'Check the request text.');
    }
  }

  async function runCloud() {
    if (!pendingContext) return;
    setBusy('Interpreting checklist');
    setRequestMessage('');
    try {
      const result = await analyzeChecklist(pendingContext);
      setCloudResult(result);
      setPendingContext(undefined);
      applyChecklist(result.checklist, 'Cloud · Firebase AI Logic');
    } catch {
      setRequestMessage('Cloud interpretation failed. Check Firebase and App Check setup or use a manual checklist.');
    } finally {
      setBusy(undefined);
    }
  }

  function useManualChecklist() {
    const next: Checklist = {
      title: 'Custom request',
      items: manualFields.map(field => ({ field, evidence: '', note: 'Selected for this request.' })),
      questions: [],
    };
    setPendingContext(undefined);
    setCloudResult(undefined);
    setRequestMessage('Manual checklist applied.');
    applyChecklist(next, 'Manual checklist');
  }

  async function importReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      setReceiptMessage('Choose a JPEG or PNG image up to 20 MB.');
      return;
    }
    setReceiptMessage('');
    setBusy('Opening receipt');
    try {
      setReceipt({ image: await processImage(file), name: file.name });
      setValues({});
      setSuggestions({});
      setOrigin('Manual review');
    } catch {
      setReceiptMessage('The receipt image could not be opened.');
    } finally {
      setBusy(undefined);
    }
  }

  function restoreSample() {
    setReceipt(undefined);
    setValues({ ...demoReceipt });
    setSuggestions({});
    setReceiptMessage('');
    setOrigin('Sample data');
  }

  async function setupModel() {
    setBusy('Preparing on-device model');
    setReceiptMessage('');
    try {
      await prepareLocalModel(progress => setModelStatus(`Downloading · ${Math.round(progress * 100)}%`));
      setModelStatus('Local model ready');
    } catch {
      setModelStatus('Local model unavailable');
      setReceiptMessage('This browser could not prepare Gemini Nano. You can enter receipt values manually.');
    } finally {
      setBusy(undefined);
    }
  }

  async function extractReceipt() {
    setBusy('Reading on device');
    setReceiptMessage('');
    try {
      const result = await readReceipt(receipt?.image ?? await sampleImage(), checklist);
      const next = { ...values };
      for (const { field } of checklist.items) {
        const suggestion = result.suggestions[field];
        if (suggestion) next[field] = suggestion.value;
      }
      setValues(next);
      setSuggestions(previous => ({ ...previous, ...result.suggestions }));
      setOrigin('On device · Firebase AI Logic');
      setModelStatus('Local model ready');
      setReceiptMessage(
        Object.keys(result.suggestions).length
          ? 'Check suggested values against the receipt before sharing.'
          : 'No clear matches were found. Enter the requested values manually.',
      );
    } catch {
      setReceiptMessage('On-device reading didn’t complete. Try again or enter the values manually.');
    } finally {
      setBusy(undefined);
    }
  }

  function changeValue(field: Field, value: string) {
    setValues({ ...values, [field]: value });
    setSuggestions(previous => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function downloadSummary() {
    const url = URL.createObjectURL(new Blob([exportHtml(checklist.title, rows)], { type: 'text/html;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'need-to-know-summary.html';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (!remember) {
      setMessage('Summary prepared. Choose where to send it.');
      return;
    }
    const next = [{
      id: crypto.randomUUID(),
      title: checklist.title,
      fields: rows.map(row => row.label),
      at: new Date().toISOString(),
    }, ...history].slice(0, 30);
    try {
      localStorage.setItem(historyKey, JSON.stringify(next));
      setHistory(next);
      setMessage('Summary prepared and recorded in local history.');
    } catch {
      setMessage('Summary prepared. This browser could not save the history entry.');
    }
  }

  function clearHistory() {
    try {
      localStorage.removeItem(historyKey);
      setHistory([]);
    } catch {
      setMessage('This browser could not clear the local history.');
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="frame topbar-inner">
          <button className="wordmark" onClick={() => setTab('workspace')} aria-label="Need-to-Know workspace">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
            Need<span className="wordmark-break">-</span>to<span className="wordmark-break">-</span>Know
          </button>
          <nav aria-label="Main">
            <button className={tab === 'workspace' ? 'current' : ''} aria-current={tab === 'workspace' ? 'page' : undefined}
              onClick={() => { setTab('workspace'); setMessage(''); }}>Workspace</button>
            <button className={tab === 'history' ? 'current' : ''} aria-current={tab === 'history' ? 'page' : undefined}
              onClick={() => { setTab('history'); setMessage(''); }}>History</button>
          </nav>
          <span className="header-status"><span aria-hidden="true" />Originals stay local</span>
        </div>
      </header>

      <main className="frame">
        {tab === 'history' ? (
          <section className="history-page">
            <div className="intro">
              <h1>Disclosure history</h1>
              <p>Saved exports show which fields you prepared on this device.</p>
            </div>
            <div className="panel history-panel">
              {history.length ? (
                <>
                  <div className="panel-heading">
                    <h2>Saved exports</h2>
                    <button className="button secondary" onClick={clearHistory}>Clear history</button>
                  </div>
                  <ul className="history-list">
                    {history.map(entry => (
                      <li key={entry.id}>
                        <strong>{entry.title}</strong>
                        <p>{entry.fields.join(' · ')}</p>
                        <time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <p>No exports recorded yet. Choose “Record in history” when downloading a summary.</p>}
              {message && <Notice>{message}</Notice>}
            </div>
          </section>
        ) : (
          <>
            <div className="intro">
              <h1>Share only what’s needed.</h1>
              <p>Start with a request. Review the details your recipient needs, then make a copy to share.</p>
            </div>

            <section className="request-section" aria-labelledby="request-title">
              <div className="section-heading">
                <h2 id="request-title">Choose a request</h2>
                <span>Try both with the same sample receipt</span>
              </div>
              <div className="request-options">
                <button className="request-card" aria-pressed={choice === 'reimbursement'} disabled={Boolean(busy)}
                  onClick={() => chooseRequest('reimbursement')}>
                  <span className="request-icon" aria-hidden="true">$</span>
                  <span><strong>Work reimbursement</strong><small>Merchant, date, final total</small></span>
                  <span className="selection-ring" aria-hidden="true" />
                </button>
                <button className="request-card" aria-pressed={choice === 'warranty'} disabled={Boolean(busy)}
                  onClick={() => chooseRequest('warranty')}>
                  <span className="request-icon" aria-hidden="true">✓</span>
                  <span><strong>Warranty request</strong><small>Product, date, order number</small></span>
                  <span className="selection-ring" aria-hidden="true" />
                </button>
                <button className="request-card" aria-pressed={choice === 'custom'} disabled={Boolean(busy)}
                  onClick={() => chooseRequest('custom')}>
                  <span className="request-icon" aria-hidden="true">+</span>
                  <span><strong>Your own request</strong><small>Use a recipient’s checklist</small></span>
                  <span className="selection-ring" aria-hidden="true" />
                </button>
              </div>

              <details className="request-details" open={choice === 'custom' || undefined}>
                <summary>{choice === 'custom' ? 'Custom request' : 'View checklist and cloud controls'}</summary>
                <div className="request-detail-body">
                  <form onSubmit={reviewContext}>
                    <label htmlFor="request-kind">Checklist source</label>
                    <select id="request-kind" value={requestKind} disabled={Boolean(busy)} onChange={event => {
                      setRequestKind(event.target.value as ChecklistContext['kind']);
                      setRequestText('');
                      setPendingContext(undefined);
                      setRequestMessage('');
                    }}>
                      <option value="request">Request text</option>
                      <option value="public">Public checklist link</option>
                    </select>
                    <label htmlFor="request-context">{requestKind === 'public' ? 'Public HTTPS link' : 'Recipient’s request'}</label>
                    <textarea id="request-context" value={requestText} maxLength={2400} rows={3} disabled={Boolean(busy)}
                      placeholder={requestKind === 'public' ? 'https://example.org/checklist' : 'Paste just the instructions you are comfortable sharing.'}
                      onChange={event => { setRequestText(event.target.value); setPendingContext(undefined); setRequestMessage(''); }} />
                    <button type="submit" className="button secondary" disabled={Boolean(busy) || !requestText.trim()}>
                      Review cloud request
                    </button>
                  </form>
                  {pendingContext && (
                    <div className="request-preview">
                      <h3>Cloud prompt preview</h3>
                      <p>Check the request context before sending it to Firebase AI Logic.</p>
                      <pre>{cloudPrompt(pendingContext)}</pre>
                      <button className="button primary" disabled={Boolean(busy) || !cloudConfigured} onClick={runCloud}>
                        Send to Gemini
                      </button>
                      {!cloudConfigured && <p className="muted">Connect Firebase and App Check to run cloud inference.</p>}
                    </div>
                  )}
                  {cloudResult && (
                    <details className="request-preview" open>
                      <summary>Cloud result and sources</summary>
                      <div className="cloud-result">
                        <p>Firebase AI Logic inference source <strong>{cloudResult.source}</strong></p>
                        <pre>{cloudResult.prompt}</pre>
                        {cloudResult.sources.length > 0 && <ul>
                          {cloudResult.sources.map(source => <li key={source.url}>
                            <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                          </li>)}
                        </ul>}
                        {cloudResult.suggestionsHtml && <iframe className="search-suggestions" title="Google Search suggestions"
                          sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={cloudResult.suggestionsHtml} />}
                      </div>
                    </details>
                  )}
                  {choice === 'custom' && (
                    <details className="manual-checklist">
                      <summary>Choose fields manually</summary>
                      <div className="manual-fields">
                        {fields.map(field => <label key={field}>
                          <input type="checkbox" checked={manualFields.includes(field)} disabled={Boolean(busy)}
                            onChange={() => setManualFields(fieldToggle(manualFields, field))} /> {fieldLabels[field]}
                        </label>)}
                        <button className="button secondary" disabled={Boolean(busy) || !manualFields.length}
                          onClick={useManualChecklist}>Apply manual checklist</button>
                      </div>
                    </details>
                  )}
                  {requestMessage && <Notice>{requestMessage}</Notice>}
                </div>
              </details>
            </section>

            <div className="workspace-grid">
              <section className="panel source-panel" aria-labelledby="source-title">
                <div className="panel-heading">
                  <div><h2 id="source-title">Original receipt</h2><p>{receipt?.name ?? 'Sample receipt'}</p></div>
                  <span className="badge local-badge"><span aria-hidden="true" />On your device</span>
                </div>
                <div className="document-stage">
                  {receipt
                    ? (previewUrl && <img className="imported-receipt" alt="Receipt imported from this device" src={previewUrl} />)
                    : <SampleReceipt active={active} />}
                </div>
                <div className="source-controls">
                  <input ref={inputRef} type="file" hidden accept="image/png,image/jpeg" onChange={importReceipt} aria-label="Choose receipt image" />
                  <button className="button secondary" disabled={Boolean(busy)} onClick={() => inputRef.current?.click()}>Import receipt</button>
                  {receipt && <button className="button text-button" disabled={Boolean(busy)} onClick={restoreSample}>Use sample</button>}
                  {localConfigured && <button className="button text-button" disabled={Boolean(busy)} onClick={setupModel}>Prepare local model</button>}
                  <button className="button text-button" disabled={Boolean(busy) || !localConfigured || !editable}
                    onClick={extractReceipt}>Read with Gemini Nano</button>
                </div>
                <div className="source-state">
                  <span>{origin}</span><span>{busy ?? modelStatus}</span>
                </div>
                {receiptMessage && <Notice>{receiptMessage}</Notice>}
              </section>

              <section className="panel review-panel" aria-labelledby="review-title">
                <div className="panel-heading">
                  <div><h2 id="review-title">Prepare your copy</h2><p>{checklist.title}</p></div>
                  <span className="badge">{checklistSource}</span>
                </div>
                <div className="review-body">
                  {checklist.questions.length > 0 && <ul className="questions">{checklist.questions.map((question, index) =>
                    <li key={index}>{question}</li>)}</ul>}
                  {editable ? <ul className="review-fields">
                    {checklist.items.map(item => (
                      <li className={active === item.field ? 'active-field' : ''} key={item.field}>
                        <label className="field-checkbox">
                          <input type="checkbox" checked={selected.includes(item.field)} disabled={Boolean(busy)}
                            onChange={() => { setActive(item.field); setSelected(fieldToggle(selected, item.field)); }}
                            aria-label={`Include ${fieldLabels[item.field]}`} />
                        </label>
                        <div className="field-content">
                          <label htmlFor={`field-${item.field}`}>{fieldLabels[item.field]}</label>
                          <input id={`field-${item.field}`} value={values[item.field] ?? ''} maxLength={180}
                            disabled={Boolean(busy)} placeholder="Check the receipt"
                            onFocus={() => setActive(item.field)} onChange={event => changeValue(item.field, event.target.value)} />
                          <p>{item.note}</p>
                          {item.evidence && <small className="field-evidence">Request says “{item.evidence}”</small>}
                          {suggestions[item.field] && <small className="field-evidence">AI read “{suggestions[item.field]?.source}”</small>}
                        </div>
                      </li>
                    ))}
                  </ul> : <p className="muted">Choose a checklist with fields to prepare a copy.</p>}

                  <div className="export-preview">
                    <div className="export-heading">
                      <h3>Export preview</h3>
                      <span>{rows.length} {rows.length === 1 ? 'field' : 'fields'}</span>
                    </div>
                    {rows.length ? <dl>{rows.map(row => <div key={row.field}>
                      <dt>{row.label}</dt><dd>{row.value}</dd>
                    </div>)}</dl> : <p className="muted">Select and fill a field to preview it.</p>}
                  </div>
                  {missing.length > 0 && editable && (
                    <p className="missing" role="status">Omitted from the copy: {missing.map(({ field }) => fieldLabels[field]).join(', ')}.</p>
                  )}
                  <div className="export-controls">
                    <label><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Record in history</label>
                    <button className="button primary" onClick={downloadSummary} disabled={Boolean(busy) || !rows.length}>
                      Download summary
                    </button>
                  </div>
                  {message && <Notice>{message}</Notice>}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}

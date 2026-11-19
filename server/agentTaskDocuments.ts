import { resolveOwnedImageReference } from './personaReferenceResolver';
import { createHash } from 'node:crypto';
import { isTaskDocument } from '../shared/agentGeneralTask';
export type TaskDocument = { id: string; name: string; mimeType: string; text?: string; pdfBase64?: string; storedUrl?: string; error?: string };
export function collectTaskDocuments(messages: any[]): TaskDocument[] {
  const docs: TaskDocument[] = [];
  const ids = new Set<string>();
  for (const message of [...messages].reverse()) {
    const generated = Array.isArray(message.taskArtifacts) ? message.taskArtifacts.filter((file: any) => typeof file?.name === 'string' && typeof file?.content === 'string' && file.content.length <= 150000).map((file: any) => ({ name: file.name, mimeType: file.mimeType, dataUrl: 'data:text/plain;base64,' + Buffer.from(file.content, 'utf8').toString('base64') })) : [];
    const attachments = message.role === 'user' && Array.isArray(message.attachments) ? message.attachments : [];
    for (const attachment of [...generated, ...attachments]) {
      if (typeof attachment?.name !== 'string' || !isTaskDocument(attachment.name)) continue;
      const dataUrl = typeof attachment.dataUrl === 'string' ? attachment.dataUrl : '';
      const id = 'doc_' + createHash('sha256').update(attachment.name + dataUrl).digest('hex').slice(0, 12);
      if (ids.has(id)) continue;
      ids.add(id);
      const doc: TaskDocument = { id, name: attachment.name.slice(0, 180), mimeType: attachment.mimeType || '' };
      docs.push(doc);
      if (docs.length > 6) { docs.pop(); return docs; }
      if (dataUrl.startsWith('https://') || dataUrl.startsWith('supabase-media://')) { doc.storedUrl = dataUrl; continue; }
      const match = dataUrl.length < 12_000_000 && dataUrl.match(/^data:([^;,]*);base64,([A-Za-z0-9+/]*={0,2})$/);
      if (!match || !match[2] || match[2].length % 4) { doc.error = 'This attachment has no readable file bytes. Attach the file again.'; continue; }
      const bytes = Buffer.from(match[2], 'base64');
      if (attachment.name.toLowerCase().endsWith('.pdf')) {
        if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) { doc.error = 'Invalid PDF signature.'; continue; }
        doc.pdfBase64 = match[2];
      } else {
        try {
          if (bytes.length > 250_000) throw new Error('Text files must be under 250 KB.');
          doc.text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
          if (doc.text.includes('\0')) throw new Error('This file is not supported text.');
        } catch (error) { doc.error = error instanceof Error ? error.message : 'Text could not be decoded.'; }
      }
    }
  }
  return docs;
}

/** CSV parser preserving commas, newlines and escaped quotes inside fields. Never executes formulas. */
export function parseTaskCsv(text: string): string[][] {
  if (text.length > 250_000) throw new Error('CSV exceeds 250 KB.');
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false, closed = false;
  function cell() { row.push(field); field = ''; closed = false; if (row.length > 100) throw new Error('CSV exceeds 100 columns.'); }
  function line() { cell(); rows.push(row); row = []; if (rows.length > 10001) throw new Error('CSV exceeds 10,000 data rows.'); }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } }
      else field += ch;
    } else if (ch === ',' ) cell();
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; line(); }
    else if (ch === '"' && !field && !closed) quoted = true;
    else { if (closed || ch === '"') throw new Error('Malformed quoted CSV field.'); field += ch; }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  if (field || row.length || closed) line();
  if (!rows.length) throw new Error('CSV is empty.');
  if (rows.some(row => row.length !== rows[0].length)) throw new Error('CSV rows have inconsistent column counts.');
  return rows;
}

export function analyzeTaskCsv(text: string) {
  const [headers, ...rows] = parseTaskCsv(text);
  return { rowCount: rows.length, columns: headers.map((header, index) => {
    const values = rows.map(row => row[index].trim());
    const numeric = values.filter(value => /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)).map(Number).filter(Number.isFinite);
    const sum = numeric.reduce((a, b) => a + b, 0);
    if (!Number.isFinite(sum)) throw new Error('Numeric values exceed the calculation range.');
    return { name: header, index, missing: values.filter(value => !value).length, numericCount: numeric.length, nonNumericCount: values.filter(Boolean).length - numeric.length,
      ...(numeric.length ? { sum, mean: sum / numeric.length, min: Math.min(...numeric), max: Math.max(...numeric) } : {}) };
  }), numericRules: 'Only plain decimal/scientific numeric cells were calculated. Currency symbols, thousands separators, dates and formulas remain text; no locale assumptions were applied.' };
}


/** Download only this authenticated owner's private document, with a streamed size limit. */
export async function loadStoredTaskDocument(doc: TaskDocument, owner: string, storageOrigin: string, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<TaskDocument> {
  if (!doc.storedUrl) return doc;
  const reference = await resolveOwnedImageReference(doc.storedUrl, owner);
  const url = new URL(reference!);
  const path = decodeURIComponent(url.pathname);
  if (!owner || !storageOrigin || url.protocol !== 'https:' || url.origin !== new URL(storageOrigin).origin
      || !path.startsWith(`/storage/v1/object/sign/workspace-media/${owner}/`)
      || /[%\\\x00-\x1f]/.test(path) || path.split('/').some(part => part === '.' || part === '..')) {
    throw new Error('The document is not in this account’s private workspace.');
  }
  const limit = doc.name.toLowerCase().endsWith('.pdf') ? 8_000_000 : 250_000;
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  if (!response.ok || !response.body) throw new Error('Could not open the saved document. Attach it again.');
  if (Number(response.headers.get('content-length')) > limit) throw new Error('Saved document exceeds its size limit.');
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new Error('Saved document exceeds its size limit.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const mime = doc.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain';
  const [loaded] = collectTaskDocuments([{ role: 'user', attachments: [{ name: doc.name, mimeType: mime, dataUrl: `data:${mime};base64,${Buffer.concat(chunks).toString('base64')}` }] }]);
  if (!loaded || loaded.error) throw new Error(loaded?.error || 'Saved document is unreadable.');
  return { ...loaded, id: doc.id };
}

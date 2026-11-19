import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from './agentCalculator';
import { collectTaskDocuments, parseTaskCsv, analyzeTaskCsv, loadStoredTaskDocument } from './agentTaskDocuments';
import { createTaskArtifact, runGeneralTask } from './agentGeneralTask';
const attachment = (name: string, text: string) => ({ name, mimeType: 'text/plain', dataUrl: 'data:text/plain;base64,' + Buffer.from(text).toString('base64') });

test('arithmetic supports precedence, signed powers, functions, and rejects execution or infinite results', () => {
  assert.equal(calculate('1200 * (1 - 15/100)'), 1020);
  assert.equal(calculate('-2^2'), -4);
  assert.equal(calculate('2^-2'), 0.25);
  assert.equal(calculate('sum(1, 2, 3) + sqrt(16)'), 10);
  assert.equal(calculate('2^3^2'), 512);
  for (const input of ['globalThis.process.exit()', 'constructor(1)', '1/0', 'sqrt(-1)', '1;2', 'round(2,3)', '1e999', '']) assert.throws(() => calculate(input));
});

test('CSV parsing handles quoted newlines and reports excluded nonnumeric values', () => {
  const csv = 'Name,Amount\r\n"Doe, Jane",10\r\n"Line\nTwo",-2\r\nOther,"$3.50"\r\nBlank,\r\n';
  assert.equal(parseTaskCsv(csv)[2][0], 'Line\nTwo');
  const result = analyzeTaskCsv(csv);
  assert.equal(result.rowCount, 4);
  assert.deepEqual(result.columns[1], { name: 'Amount', index: 1, missing: 1, numericCount: 2, nonNumericCount: 1, sum: 8, mean: 4, min: -2, max: 10 });
  for (const invalid of ['a,b\n1', 'a\n"unterminated', 'a\n"bad"tail']) assert.throws(() => parseTaskCsv(invalid));
});

test('documents require readable bytes and generated artifacts can be reopened in a later turn', () => {
  const docs = collectTaskDocuments([{ role: 'user', attachments: [attachment('proposal.txt', 'Cost: 42'), { name: 'old.pdf', dataUrl: 'blob:temporary' }] }, { role: 'model', taskArtifacts: [{ name: 'result.csv', content: 'A,B\n1,2' }] }]);
  assert.equal(docs.length, 3);
  assert.equal(docs.find(doc => doc.name === 'proposal.txt')?.text, 'Cost: 42');
  assert.match(docs.find(doc => doc.name === 'old.pdf')?.error || '', /Attach/);
  assert.match(docs.find(doc => doc.name === 'result.csv')?.text || '', /1,2/);
  const invalidPdf = collectTaskDocuments([{ role: 'user', attachments: [attachment('fake.pdf', 'not a pdf')] }]);
  assert.match(invalidPdf[0].error || '', /PDF signature/);
});

test('exports validate JSON, reject paths, and neutralize spreadsheet formulas', () => {
  assert.throws(() => createTaskArtifact({ filename: '../escape.txt', format: 'txt', content: 'hello' }, '1'));
  assert.throws(() => createTaskArtifact({ filename: 'bad.json', format: 'json', content: '{bad}' }, '1'));
  const csv = createTaskArtifact({ filename: 'table.csv', format: 'csv', rows: [['Name', 'Value'], ['=HYPERLINK("bad")', -2]] }, '1');
  const rows = parseTaskCsv(csv.content);
  assert.ok(rows[1][0].startsWith("'="));
  assert.equal(rows[1][1], '-2');
  assert.throws(() => createTaskArtifact({ filename: 'table.csv', format: 'csv', rows: [[1, 2], [1]] }, '1'));
});

test('task loop reads a source, computes, generates a real file, and cites returned lines', async () => {
  const docs = collectTaskDocuments([{ role: 'user', attachments: [attachment('invoice.txt', 'Unit price: 25\nQuantity: 4')] }]);
  let calls = 0;
  const result = await runGeneralTask({ request: 'Calculate the total and create a JSON file', history: [], documents: docs,
    complete: async messages => {
      calls++;
      if (calls === 1) return { text: JSON.stringify({ plan: ['Read the invoice', 'Compute total', 'Prepare file'], toolCalls: [{ tool: 'read_document', args: { documentId: docs[0].id } }] }) };
      if (calls === 2) { assert.match(messages.at(-1)!.content, /Unit price: 25/); return { text: JSON.stringify({ toolCalls: [{ tool: 'calculate', args: { expression: '25*4' } }, { tool: 'create_file', args: { filename: 'total.json', format: 'json', content: '{"total":100}' } }] }) }; }
      assert.match(messages.at(-1)!.content, /"result":100/);
      return { text: JSON.stringify({ status: 'complete', text: `The total is 100. [${docs[0].id}:L1-L2] Download total.json below.` }), inputTokens: 10, outputTokens: 5 };
    } });
  assert.equal(calls, 3);
  assert.equal(result.generalTask.status, 'complete');
  assert.equal(result.generalTask.trace.length, 3);
  assert.equal(result.generalTask.artifacts[0].content, '{\n  "total": 100\n}');
  assert.deepEqual(result.suggestedSteps, []);
});

test('failed tools return real errors for correction; only successful files are offered', async () => {
  let calls = 0;
  const result = await runGeneralTask({ request: 'Calculate and save', history: [], documents: [], complete: async messages => {
    calls++;
    if (calls === 1) return { text: JSON.stringify({ toolCalls: [{ tool: 'calculate', args: { expression: '1/0' } }, { tool: 'create_file', args: { filename: 'bad.json', format: 'json', content: '{bad}' } }] }) };
    if (calls === 2) { assert.match(messages.at(-1)!.content, /"ok":false/); return { text: JSON.stringify({ toolCalls: [{ tool: 'calculate', args: { expression: '4/2' } }] }) }; }
    return { text: JSON.stringify({ status: 'partial', text: 'The corrected result is 2. No file was created.' }) };
  } });
  assert.equal(result.generalTask.status, 'partial');
  assert.deepEqual(result.generalTask.trace.map(entry => entry.status), ['failed', 'failed', 'succeeded']);
  assert.deepEqual(result.generalTask.artifacts, []);
});

test('invented document citations trigger correction and cannot become verified completion', async () => {
  const result = await runGeneralTask({ request: 'Read the document', history: [], documents: [], complete: async () => ({ text: JSON.stringify({ status: 'complete', text: 'A made-up fact [doc_fake:L1-L3]' }) }) });
  assert.equal(result.generalTask.modelCalls, 6);
  assert.equal(result.generalTask.status, 'partial');
  assert.match(result.text, /not backed/);
});

test('a request is bounded and model failures preserve completed downloads', async () => {
  let calls = 0;
  const result = await runGeneralTask({ request: 'Prepare text', documents: [], history: [], complete: async () => {
    if (++calls === 1) return { text: JSON.stringify({ toolCalls: [{ tool: 'create_file', args: { filename: 'note.txt', format: 'txt', content: 'Saved progress' } }] }) };
    throw new Error('Provider unavailable');
  } });
  assert.equal(result.generalTask.status, 'partial');
  assert.equal(result.generalTask.artifacts[0].content, 'Saved progress');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runGeneralTask({ request: 'Stop', history: [], documents: [], signal: controller.signal, complete: async () => { throw new Error(); } }), /abort/i);
});

test('private saved documents reject foreign owners and origins without fetching', async () => {
  const origin = 'https://test.supabase.co';
  let fetched = 0;
  const request = async () => { fetched++; return new Response('secret'); };
  for (const url of [
    `${origin}/storage/v1/object/sign/workspace-media/other/text/doc.txt`,
    'https://attacker.example/storage/v1/object/sign/workspace-media/owner/text/doc.txt',
    `${origin}/storage/v1/object/sign/workspace-media/owner/text/%252e%252e/doc.txt`,
  ]) await assert.rejects(loadStoredTaskDocument({ id: '1', name: 'file.txt', mimeType: 'text/plain', storedUrl: url }, 'owner', origin, new AbortController().signal, request as typeof fetch));
  assert.equal(fetched, 0);
  const loaded = await loadStoredTaskDocument({ id: '1', name: 'file.txt', mimeType: 'text/plain', storedUrl: `${origin}/storage/v1/object/sign/workspace-media/owner/text/doc.txt` }, 'owner', origin, new AbortController().signal, request as typeof fetch);
  assert.equal(loaded.text, 'secret');
  assert.equal(loaded.id, '1');
});

test('PDF extraction failure remains visible and does not produce invented document evidence', async () => {
  let calls = 0;
  const result = await runGeneralTask({ request: 'Read this PDF', history: [], documents: [{ id: 'doc_pdf', name: 'proposal.pdf', mimeType: 'application/pdf', pdfBase64: 'test' }],
    extractPdf: async () => { throw new Error('Extraction service unavailable'); }, complete: async messages => {
      if (++calls === 1) return { text: JSON.stringify({ toolCalls: [{ tool: 'read_document', args: { documentId: 'doc_pdf' } }] }) };
      assert.match(messages.at(-1)!.content, /Extraction service unavailable/);
      return { text: JSON.stringify({ status: 'partial', text: 'I could not read the PDF. Please attach a text export.' }) };
    } });
  assert.equal(result.generalTask.status, 'partial');
  assert.equal(result.generalTask.trace[0].status, 'failed');
});

test('missing requested files and unresearched claims cannot be labeled complete', async () => {
  for (const request of ['Create a downloadable CSV file', 'Research the latest news']) {
    const result = await runGeneralTask({ request, history: [], documents: [], complete: async () => ({ text: JSON.stringify({ text: 'All done.', status: 'complete' }) }) });
    assert.equal(result.generalTask.status, 'partial');
    assert.equal(result.generalTask.modelCalls, 6);
  }
});

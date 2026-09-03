import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AKN_DIR = join(ROOT, 'akn');
const MANIFEST_PATH = join(ROOT, 'manifest.json');
const AKN_NS = 'http://docs.oasis-open.org/legaldocml/ns/akn/3.0';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const OFFICIAL_SLUGS = [
  'aviso-lgpd',
  'contrato-saas',
  'politica-de-cookies',
  'politica-de-privacidade',
  'termos-de-uso',
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function fail(message) {
  throw new Error(message);
}

function listAknFiles() {
  if (!existsSync(AKN_DIR)) {
    fail('pasta akn/ não encontrada');
  }

  const files = [];
  for (const slug of readdirSync(AKN_DIR, { withFileTypes: true })) {
    if (!slug.isDirectory()) {
      continue;
    }
    const slugDir = join(AKN_DIR, slug.name);
    for (const entry of readdirSync(slugDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.xml')) {
        continue;
      }
      files.push(join(slugDir, entry.name));
    }
  }
  return files.sort();
}

function repoPath(absPath) {
  return relative(ROOT, absPath).split(sep).join('/');
}

function attr(node, name) {
  if (node == null || typeof node !== 'object') {
    return undefined;
  }
  return node[`@_${name}`];
}

function readXmlBytes(absPath) {
  return Buffer.from(readFileSync(absPath).toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
}

function parseDoc(absPath) {
  const xml = readXmlBytes(absPath);
  const rel = repoPath(absPath);
  const parts = rel.split('/');
  if (parts.length !== 3 || parts[0] !== 'akn' || !parts[2].endsWith('.xml')) {
    fail(`${rel}: path deve ser akn/{slug}/{YYYY-MM-DD}.xml`);
  }

  const slug = parts[1];
  const date = parts[2].slice(0, -4);
  if (!OFFICIAL_SLUGS.includes(slug)) {
    fail(`${rel}: slug "${slug}" não é oficial`);
  }
  if (!DATE_RE.test(date)) {
    fail(`${rel}: nome do arquivo deve ser YYYY-MM-DD.xml`);
  }

  let parsed;
  try {
    parsed = parser.parse(xml.toString('utf8'));
  } catch (error) {
    fail(`${rel}: XML malformado (${error.message})`);
  }

  const root = parsed.akomaNtoso;
  if (!root) {
    fail(`${rel}: raiz deve ser <akomaNtoso>`);
  }

  const rootXmlns = attr(root, 'xmlns');
  if (rootXmlns !== AKN_NS) {
    fail(`${rel}: namespace deve ser ${AKN_NS}`);
  }

  const doc = root.doc;
  if (!doc) {
    fail(`${rel}: falta <doc>`);
  }
  const docName = attr(doc, 'name');
  if (docName !== slug) {
    fail(`${rel}: doc/@name "${docName}" ≠ slug "${slug}"`);
  }

  const identification = doc.meta?.identification;
  const publication = doc.meta?.publication;
  if (!identification || !publication) {
    fail(`${rel}: meta deve ter identification e publication`);
  }

  const work = attr(identification.FRBRWork, 'value');
  const expression = attr(identification.FRBRExpression, 'value');
  const manifestation = attr(identification.FRBRManifestation, 'value');
  const pubDate = attr(publication, 'date');
  const title = attr(publication, 'showAs');

  const expectedWork = `/akn/br/doc/autocatalogo/${slug}`;
  const expectedExpression = `${expectedWork}/${date}`;
  const expectedManifestation = `${expectedExpression}/xml`;

  if (work !== expectedWork) {
    fail(`${rel}: FRBRWork "${work}" ≠ "${expectedWork}"`);
  }
  if (expression !== expectedExpression) {
    fail(`${rel}: FRBRExpression "${expression}" ≠ "${expectedExpression}"`);
  }
  if (manifestation !== expectedManifestation) {
    fail(`${rel}: FRBRManifestation "${manifestation}" ≠ "${expectedManifestation}"`);
  }
  if (pubDate !== date) {
    fail(`${rel}: publication/@date "${pubDate}" ≠ "${date}"`);
  }
  if (!title) {
    fail(`${rel}: publication/@showAs vazio`);
  }
  if (!doc.mainBody) {
    fail(`${rel}: falta mainBody`);
  }

  return {
    slug,
    title,
    version: date,
    frbrWork: work,
    frbrExpression: expression,
    path: rel,
    contentHash: `sha256:${createHash('sha256').update(xml).digest('hex')}`,
    publishedAt: pubDate,
  };
}

function buildManifest() {
  const bySlug = new Map();
  for (const file of listAknFiles()) {
    const doc = parseDoc(file);
    const current = bySlug.get(doc.slug);
    if (!current || doc.version > current.version) {
      bySlug.set(doc.slug, doc);
    }
  }

  const documents = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  return { documents };
}

function readExistingManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    return null;
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function writeManifest() {
  const { documents } = buildManifest();
  const existing = readExistingManifest();
  const sameDocs = existing && JSON.stringify(existing.documents) === JSON.stringify(documents);
  const manifest = {
    generatedAt: sameDocs ? existing.generatedAt : new Date().toISOString(),
    documents,
  };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

function validate() {
  const files = listAknFiles();
  if (files.length === 0) {
    fail('nenhum XML em akn/');
  }
  for (const file of files) {
    parseDoc(file);
  }
  console.log(`OK: ${files.length} documento(s) AKN válidos`);
}

function ci() {
  validate();
  const before = existsSync(MANIFEST_PATH) ? readFileSync(MANIFEST_PATH, 'utf8') : null;
  writeManifest();
  const after = readFileSync(MANIFEST_PATH, 'utf8');
  if (before !== after) {
    fail('manifest.json desatualizado — rode `npm run generate-manifest` e commite o arquivo');
  }
  console.log('OK: manifest.json atualizado');
}

const command = process.argv[2];
try {
  if (command === 'validate') {
    validate();
  } else if (command === 'generate') {
    const manifest = writeManifest();
    console.log(`OK: manifest.json com ${manifest.documents.length} documento(s)`);
  } else if (command === 'ci') {
    ci();
  } else {
    fail('uso: node scripts/akn.mjs validate|generate|ci');
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

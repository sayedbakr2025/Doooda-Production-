import type { Chapter, Scene, Project } from '../../../types';
import type { KdpMetadata } from './kdpMetadataGenerator';

export interface EpubChapter {
  id: string;
  slug: string;
  title: string;
  filename: string;
  contentHtml: string;
  scenes: EpubScene[];
  wordCount: number;
}

export interface EpubScene {
  id: string;
  title: string;
  contentHtml: string;
}

export interface EpubManifest {
  lang: string;
  dir: 'ltr' | 'rtl';
  title: string;
  subtitle: string;
  author: string;
  description: string;
  uid: string;
  publicationDate: string;
  coverFilename: string | null;
  chapters: EpubChapter[];
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(text: string, idx: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40) || `item`;
  return `${base}-${idx}`;
}

function cleanContent(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function textToXhtmlParagraphs(text: string): string {
  if (!text || !text.trim()) return '';
  return cleanContent(text)
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${escapeHtml(p.replace(/\n/g, ' ').trim())}</p>`)
    .join('\n      ');
}

function stripInlineStyles(html: string): string {
  return html.replace(/\s+style="[^"]*"/gi, '');
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function generateUid(title: string): string {
  const ts = Date.now().toString(36);
  const safe = title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10) || 'book';
  return `urn:uuid:${safe}-${ts}`;
}

export function buildEpubManifest(
  project: Project,
  chapters: Chapter[],
  scenesMap: Record<string, Scene[]>,
  metadata: KdpMetadata,
  language: 'ar' | 'en'
): EpubManifest {
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const activeChapters = chapters.filter((c) => c.is_active !== false);

  const epubChapters: EpubChapter[] = activeChapters.map((ch, idx) => {
    const slug = slugify(ch.title, idx + 1);
    const chapterId = `ch${idx + 1}`;
    const activeScenes = (scenesMap[ch.id] || []).filter((s) => s.is_active !== false);

    const scenes: EpubScene[] = activeScenes.map((sc, si) => ({
      id: `${chapterId}-sc${si + 1}`,
      title: sc.title || '',
      contentHtml: textToXhtmlParagraphs(sc.content || ''),
    }));

    let chapterContentHtml = '';
    if (ch.content && ch.content.trim()) {
      chapterContentHtml = textToXhtmlParagraphs(ch.content);
    }

    const allText = [ch.content || '', ...activeScenes.map((s) => s.content || '')].join(' ');
    const wc = countWords(allText);

    return {
      id: chapterId,
      slug,
      title: ch.title,
      filename: `${slug}.xhtml`,
      contentHtml: stripInlineStyles(chapterContentHtml),
      scenes,
      wordCount: wc,
    };
  });

  return {
    lang: language,
    dir,
    title: metadata.title || project.title,
    subtitle: metadata.subtitle || '',
    author: metadata.authorName || '',
    description: metadata.description || '',
    uid: generateUid(metadata.title || project.title),
    publicationDate: metadata.publicationDate || new Date().toISOString().split('T')[0],
    coverFilename: null,
    chapters: epubChapters,
  };
}

export function renderChapterXhtml(ch: EpubChapter, manifest: EpubManifest): string {
  const { dir, lang } = manifest;
  const titleEsc = escapeHtml(ch.title);

  let body = `<h1 class="chapter-title">${titleEsc}</h1>\n`;

  if (ch.contentHtml) {
    body += `      ${ch.contentHtml}\n`;
  }

  ch.scenes.forEach((sc) => {
    if (sc.title && sc.title.trim()) {
      body += `      <h2 class="scene-title">${escapeHtml(sc.title)}</h2>\n`;
    }
    if (sc.contentHtml) {
      body += `      ${sc.contentHtml}\n`;
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="${lang}"
      lang="${lang}"
      dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${titleEsc}</title>
  <link rel="stylesheet" type="text/css" href="../styles/main.css"/>
</head>
<body>
  <section epub:type="chapter" id="${ch.id}">
    ${body}
  </section>
</body>
</html>`;
}

export function renderCoverXhtml(manifest: EpubManifest): string {
  const { dir, lang, title, subtitle, author } = manifest;
  const titleEsc = escapeHtml(title);
  const subtitleEsc = escapeHtml(subtitle);
  const authorEsc = escapeHtml(author);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="${lang}"
      lang="${lang}"
      dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${titleEsc}</title>
  <link rel="stylesheet" type="text/css" href="../styles/main.css"/>
</head>
<body>
  <section epub:type="cover" id="cover">
    <div class="cover-page">
      <h1 class="cover-title">${titleEsc}</h1>
      ${subtitleEsc ? `<p class="cover-subtitle">${subtitleEsc}</p>` : ''}
      ${authorEsc ? `<p class="cover-author">${authorEsc}</p>` : ''}
    </div>
  </section>
</body>
</html>`;
}

export function renderTocXhtml(manifest: EpubManifest): string {
  const { dir, lang, title, chapters } = manifest;
  const tocLabel = lang === 'ar' ? 'فهرس المحتويات' : 'Table of Contents';
  const titleEsc = escapeHtml(title);

  const items = chapters
    .map((ch) => `    <li><a href="${ch.filename}#${ch.id}">${escapeHtml(ch.title)}</a></li>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="${lang}"
      lang="${lang}"
      dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${titleEsc}</title>
  <link rel="stylesheet" type="text/css" href="../styles/main.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${escapeHtml(tocLabel)}</h1>
    <ol>
${items}
    </ol>
  </nav>
</body>
</html>`;
}

export function renderMainCss(dir: 'ltr' | 'rtl'): string {
  return `/* Doooda KDP Kindle Export — clean semantic styles, no fixed margins, no page breaks */

body {
  font-family: serif;
  font-size: 1em;
  line-height: 1.65;
  direction: ${dir};
  text-align: ${dir === 'rtl' ? 'right' : 'left'};
  margin: 0;
  padding: 0;
  color: #111;
  background: #fff;
}

.cover-page {
  text-align: center;
  padding: 3em 1em;
}

.cover-title {
  font-size: 2em;
  margin-bottom: 0.4em;
  line-height: 1.2;
}

.cover-subtitle {
  font-size: 1.1em;
  font-style: italic;
  margin-top: 0.2em;
  color: #555;
}

.cover-author {
  font-size: 1.2em;
  margin-top: 1.5em;
  color: #333;
}

.chapter-title {
  font-size: 1.6em;
  margin: 1.5em 0 1em;
  text-align: center;
  font-weight: bold;
}

.scene-title {
  font-size: 1.15em;
  margin: 1.5em 0 0.6em;
  font-weight: bold;
  ${dir === 'rtl' ? 'text-align: right;' : 'text-align: left;'}
}

p {
  margin: 0 0 0.7em;
  text-indent: 0;
}

nav h1 {
  font-size: 1.4em;
  margin-bottom: 1em;
  text-align: center;
}

nav ol {
  list-style: none;
  padding: 0;
  margin: 0;
}

nav li {
  padding: 0.35em 0;
  border-bottom: 1px solid #eee;
}

nav a {
  text-decoration: none;
  color: inherit;
  display: block;
}

nav a:hover {
  text-decoration: underline;
}
`;
}

export function renderNcxXml(manifest: EpubManifest): string {
  const { uid, title, author, chapters } = manifest;
  const titleEsc = escapeXml(title);
  const authorEsc = escapeXml(author);

  const navPoints = chapters
    .map(
      (ch, i) => `    <navPoint id="nav-${ch.id}" playOrder="${i + 2}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="Text/${ch.filename}#${ch.id}"/>
    </navPoint>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(uid)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${titleEsc}</text></docTitle>
  <docAuthor><text>${authorEsc}</text></docAuthor>
  <navMap>
    <navPoint id="nav-cover" playOrder="1">
      <navLabel><text>${escapeXml(title)}</text></navLabel>
      <content src="Text/cover.xhtml"/>
    </navPoint>
${navPoints}
  </navMap>
</ncx>`;
}

export function renderOpfXml(manifest: EpubManifest): string {
  const { uid, title, author, description, lang, publicationDate, chapters } = manifest;
  const titleEsc = escapeXml(title);
  const authorEsc = escapeXml(author);
  const descEsc = escapeXml(description);

  const manifestItems = [
    `    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `    <item id="nav" href="Text/toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `    <item id="css-main" href="Styles/main.css" media-type="text/css"/>`,
    `    <item id="cover-doc" href="Text/cover.xhtml" media-type="application/xhtml+xml" properties="svg"/>`,
    ...chapters.map(
      (ch) => `    <item id="${ch.id}" href="Text/${ch.filename}" media-type="application/xhtml+xml"/>`
    ),
  ].join('\n');

  const spineItems = [
    `    <itemref idref="cover-doc" linear="yes"/>`,
    `    <itemref idref="nav" linear="yes"/>`,
    ...chapters.map((ch) => `    <itemref idref="${ch.id}" linear="yes"/>`),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         version="3.0"
         unique-identifier="uid"
         xml:lang="${lang}">

  <metadata xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="uid">${escapeXml(uid)}</dc:identifier>
    <dc:title>${titleEsc}</dc:title>
    <dc:creator>${authorEsc}</dc:creator>
    <dc:language>${lang}</dc:language>
    <dc:date>${escapeXml(publicationDate)}</dc:date>
    ${descEsc ? `<dc:description>${descEsc}</dc:description>` : ''}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
    <meta property="rendition:layout">reflowable</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">auto</meta>
  </metadata>

  <manifest>
${manifestItems}
  </manifest>

  <spine toc="ncx">
${spineItems}
  </spine>

</package>`;
}

export function renderContainerXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

export interface EpubFileEntry {
  path: string;
  content: string;
  binary?: false;
}

export function buildEpubFileList(manifest: EpubManifest): EpubFileEntry[] {
  const files: EpubFileEntry[] = [];

  files.push({ path: 'mimetype', content: 'application/epub+zip' });
  files.push({ path: 'META-INF/container.xml', content: renderContainerXml() });
  files.push({ path: 'OEBPS/content.opf', content: renderOpfXml(manifest) });
  files.push({ path: 'OEBPS/toc.ncx', content: renderNcxXml(manifest) });
  files.push({ path: 'OEBPS/Styles/main.css', content: renderMainCss(manifest.dir) });
  files.push({ path: 'OEBPS/Text/cover.xhtml', content: renderCoverXhtml(manifest) });
  files.push({ path: 'OEBPS/Text/toc.xhtml', content: renderTocXhtml(manifest) });

  manifest.chapters.forEach((ch) => {
    files.push({
      path: `OEBPS/Text/${ch.filename}`,
      content: renderChapterXhtml(ch, manifest),
    });
  });

  return files;
}

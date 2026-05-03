export type KdpTrimSize = '5x8' | '6x9' | '8.5x11';
export type KdpInteriorType = 'black_white' | 'premium_color';
export type KdpPaperType = 'cream' | 'white';

export interface KdpTrimSpec {
  id: KdpTrimSize;
  labelEn: string;
  labelAr: string;
  widthIn: number;
  heightIn: number;
}

export const KDP_TRIM_SPECS: KdpTrimSpec[] = [
  { id: '5x8',    labelEn: '5" × 8"',           labelAr: '5 × 8 بوصة',         widthIn: 5,   heightIn: 8  },
  { id: '6x9',    labelEn: '6" × 9" (Standard)', labelAr: '6 × 9 بوصة (قياسي)', widthIn: 6,   heightIn: 9  },
  { id: '8.5x11', labelEn: '8.5" × 11"',         labelAr: '8.5 × 11 بوصة',      widthIn: 8.5, heightIn: 11 },
];

export interface KdpMargins {
  topIn: number;
  bottomIn: number;
  outerIn: number;
  innerIn: number;
}

export interface KdpSpineSpec {
  spineWidthIn: number;
  coverWidthIn: number;
  totalWidthIn: number;
  pageCount: number;
}

export interface KdpPrintLayoutSpec {
  trim: KdpTrimSpec;
  margins: KdpMargins;
  spine: KdpSpineSpec;
  wordsPerPage: number;
  estimatedPageCount: number;
  fontSizePt: number;
  lineHeightRatio: number;
  warnings: KdpPrintWarning[];
}

export interface KdpPrintWarning {
  code: string;
  severity: 'error' | 'warning';
  messageEn: string;
  messageAr: string;
}

const MIN_PAGE_COUNT = 24;

export function estimatePageCount(wordCount: number, trimSize: KdpTrimSize): number {
  const wpp: Record<KdpTrimSize, number> = {
    '5x8': 230,
    '6x9': 250,
    '8.5x11': 400,
  };
  return Math.max(1, Math.round(wordCount / wpp[trimSize]));
}

export function calcSpineWidth(pageCount: number, _paperType: KdpPaperType = 'cream'): number {
  return pageCount * 0.002252;
}

export function calcMargins(pageCount: number, trimSize: KdpTrimSize): KdpMargins {
  const top = 0.75;
  const bottom = 0.75;

  let inner: number;
  if (pageCount <= 150) {
    inner = 0.75;
  } else if (pageCount <= 300) {
    inner = 0.875;
  } else if (pageCount <= 500) {
    inner = 1.0;
  } else if (pageCount <= 700) {
    inner = 1.125;
  } else {
    inner = 1.25;
  }

  const outer = trimSize === '8.5x11' ? 0.75 : 0.625;

  return { topIn: top, bottomIn: bottom, outerIn: outer, innerIn: inner };
}

export function buildPrintLayoutSpec(
  wordCount: number,
  trimSize: KdpTrimSize,
  interiorType: KdpInteriorType = 'black_white',
  paperType: KdpPaperType = 'cream'
): KdpPrintLayoutSpec {
  const trim = KDP_TRIM_SPECS.find((t) => t.id === trimSize) ?? KDP_TRIM_SPECS[1];
  const estimatedPageCount = estimatePageCount(wordCount, trimSize);
  const margins = calcMargins(estimatedPageCount, trimSize);
  const spineWidthIn = calcSpineWidth(estimatedPageCount, paperType);
  const coverWidthIn = trim.widthIn;
  const totalWidthIn = coverWidthIn * 2 + spineWidthIn + 0.25;

  const spine: KdpSpineSpec = {
    spineWidthIn: parseFloat(spineWidthIn.toFixed(4)),
    coverWidthIn,
    totalWidthIn: parseFloat(totalWidthIn.toFixed(4)),
    pageCount: estimatedPageCount,
  };

  const fontSizePt = trimSize === '8.5x11' ? 12 : 11;
  const lineHeightRatio = 1.6;

  const wpp: Record<KdpTrimSize, number> = { '5x8': 230, '6x9': 250, '8.5x11': 400 };

  const warnings: KdpPrintWarning[] = [];

  if (estimatedPageCount < MIN_PAGE_COUNT) {
    warnings.push({
      code: 'PAGE_COUNT_LOW',
      severity: 'warning',
      messageEn: `Estimated page count (${estimatedPageCount}) is below the KDP minimum of ${MIN_PAGE_COUNT} pages. Add more content before publishing.`,
      messageAr: `عدد الصفحات المقدّر (${estimatedPageCount}) أقل من الحد الأدنى لـ KDP وهو ${MIN_PAGE_COUNT} صفحة. أضف محتوى أكثر قبل النشر.`,
    });
  }

  if (estimatedPageCount < 24 && interiorType === 'premium_color') {
    warnings.push({
      code: 'COLOR_TOO_SHORT',
      severity: 'warning',
      messageEn: 'Premium color is not cost-effective for books under 24 pages.',
      messageAr: 'الطباعة الملونة الفاخرة غير مجدية اقتصاديًا للكتب التي تقل عن 24 صفحة.',
    });
  }

  return {
    trim,
    margins,
    spine,
    wordsPerPage: wpp[trimSize],
    estimatedPageCount,
    fontSizePt,
    lineHeightRatio,
    warnings,
  };
}

export function fmtIn(n: number): string {
  return n.toFixed(3) + '"';
}

export function buildPrintCss(spec: KdpPrintLayoutSpec, isRTL: boolean, showRunningHeader: boolean, titleEsc: string, authorEsc: string): string {
  const { trim, margins, fontSizePt, lineHeightRatio } = spec;
  const dir = isRTL ? 'rtl' : 'ltr';
  const fontFamily = isRTL
    ? "'Amiri', 'Times New Roman', serif"
    : "'Georgia', 'Times New Roman', serif";

  const runningHeaderRules = showRunningHeader
    ? `
    @page :left {
      @top-left { content: "${titleEsc}"; font-size: 8pt; color: #555; font-family: ${fontFamily}; }
      @bottom-left { content: counter(page); font-size: 9pt; font-family: ${fontFamily}; }
    }
    @page :right {
      @top-right { content: "${authorEsc}"; font-size: 8pt; color: #555; font-family: ${fontFamily}; }
      @bottom-right { content: counter(page); font-size: 9pt; font-family: ${fontFamily}; }
    }
    @page :first {
      @top-left { content: ""; }
      @top-right { content: ""; }
      @bottom-left { content: ""; }
      @bottom-right { content: ""; }
    }
    @page :blank { @top-left { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-right { content: ""; } }`
    : `
    @page :left { @bottom-left { content: counter(page); font-size: 9pt; font-family: ${fontFamily}; } }
    @page :right { @bottom-right { content: counter(page); font-size: 9pt; font-family: ${fontFamily}; } }
    @page :first { @bottom-left { content: ""; } @bottom-right { content: ""; } }
    @page :blank { @bottom-left { content: ""; } @bottom-right { content: ""; } }`;

  return `
    @page {
      size: ${trim.widthIn}in ${trim.heightIn}in;
      margin-top: ${margins.topIn}in;
      margin-bottom: ${margins.bottomIn}in;
    }
    @page :left {
      margin-left: ${margins.outerIn}in;
      margin-right: ${margins.innerIn}in;
    }
    @page :right {
      margin-right: ${margins.outerIn}in;
      margin-left: ${margins.innerIn}in;
    }
    ${runningHeaderRules}

    * { box-sizing: border-box; }

    body {
      font-family: ${fontFamily};
      font-size: ${fontSizePt}pt;
      line-height: ${lineHeightRatio};
      direction: ${dir};
      text-align: ${isRTL ? 'right' : 'justify'};
      color: #111111;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .front-matter {
      page: front-matter;
    }

    @page front-matter {
      @bottom-left { content: ""; }
      @bottom-right { content: ""; }
    }

    .cover {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: right;
    }

    .cover h1 {
      font-size: ${fontSizePt + 11}pt;
      margin-bottom: 0.5em;
      line-height: 1.2;
      color: #111111;
    }

    .cover .subtitle {
      font-size: ${fontSizePt + 1}pt;
      color: #444444;
      margin-top: 0.3em;
      font-style: italic;
    }

    .cover .author {
      font-size: ${fontSizePt + 2}pt;
      margin-top: 1.5em;
      color: #333333;
    }

    .chapter {
      page-break-before: right;
      padding-top: 1.5in;
      orphans: 3;
      widows: 3;
    }

    .chapter:first-of-type {
      page-break-before: avoid;
      padding-top: 1in;
    }

    .chapter-title {
      font-size: ${fontSizePt + 5}pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 2em;
      margin-top: 0;
      page-break-after: avoid;
      line-height: 1.3;
      color: #111111;
    }

    p {
      margin: 0 0 0em;
      text-indent: ${isRTL ? '0' : '1.5em'};
      orphans: 3;
      widows: 3;
      color: #111111;
    }

    p:first-of-type {
      text-indent: 0;
    }

    p + p {
      margin-top: 0;
    }

    .doooda-footer {
      margin-top: 3em;
      padding-top: 1.5em;
      border-top: 1px solid #dddddd;
      text-align: center;
      font-size: 8pt;
      color: #aaaaaa;
      font-style: italic;
    }

    @media print {
      .chapter { page-break-before: right; }
      body { color: #000000 !important; }
    }

    .double-page-spread {
      display: flex;
      flex-direction: row;
      gap: 0.5in;
      page-break-inside: avoid;
      margin: 1em 0;
    }

    .double-page-left,
    .double-page-right {
      flex: 1;
      padding: 0.25in;
      border: 1px solid #cccccc;
      background-color: #fafafa;
    }

    .double-page-left {
      border-right: none;
    }

    .double-page-right {
      border-left: none;
    }

    [dir="rtl"] .double-page-left {
      border-right: 1px solid #cccccc;
      border-left: none;
    }

    [dir="rtl"] .double-page-right {
      border-left: 1px solid #cccccc;
      border-right: none;
    }
  `;
}

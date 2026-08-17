// Hands a rendered document to the browser's own print engine.
//
// The document goes into an off-screen same-origin iframe carrying its own
// print stylesheet, then window.print() runs against it. The browser's PDF
// writer keeps text and diagram SVG as vectors — selectable, searchable and
// small — which no JS PDF library manages without rasterizing.

export interface PrintDocumentOptions {
  /** Rendered document markup, without the wrapping `.md-doc` element. */
  html: string;
  /** Stylesheet text, including any `@page` rule. */
  css: string;
  /** Becomes the iframe document's title, which seeds the suggested filename. */
  title: string;
  /** Called once the print dialog has been dismissed, or on failure. */
  onFinished?: () => void;
}

/** Serialized <style> and <link rel="stylesheet"> from the host page. next/font
 *  self-hosts its @font-face rules there, so without these the iframe falls
 *  back to system fonts. srcdoc inherits the parent's base URL, so the
 *  /_next/static/media/* references still resolve. */
function collectHostStyles(): string {
  return Array.from(
    document.querySelectorAll<HTMLElement>('style, link[rel="stylesheet"]')
  )
    .map(node => node.outerHTML)
    .join('\n');
}

async function waitForAssets(win: Window): Promise<void> {
  const doc = win.document;
  try {
    await doc.fonts?.ready;
  } catch {
    // Font loading isn't observable everywhere; printing is still fine.
  }
  const images = Array.from(doc.images).filter(img => !img.complete);
  await Promise.all(
    images.map(
      img =>
        new Promise<void>(resolve => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        })
    )
  );
  // One frame for layout to settle after fonts swap in.
  await new Promise<void>(resolve => win.requestAnimationFrame(() => resolve()));
}

export function printDocument({ html, css, title, onFinished }: PrintDocumentOptions): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  // Attached and laid out at a realistic page width — a zero-sized iframe
  // makes some engines mis-paginate — but visually inert.
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;z-index:-1;';

  let cleanedUp = false;
  let fallbackTimer: number | undefined;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    iframe.remove();
    onFinished?.();
  };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }

    void (async () => {
      try {
        await waitForAssets(win);
        // afterprint is the normal exit; Safari fires it unreliably, so a
        // timer backs it up rather than leaking the iframe.
        win.addEventListener('afterprint', cleanup, { once: true });
        fallbackTimer = window.setTimeout(cleanup, 120_000);
        win.focus();
        win.print();
      } catch {
        cleanup();
      }
    })();
  };

  // Carrying the host <html> class list over brings next/font's --font-*
  // custom properties with it, which the document stylesheet references.
  const htmlClass = document.documentElement.className;

  iframe.srcdoc = `<!doctype html>
<html lang="en" class="${htmlClass}">
<head>
<meta charset="utf-8">
<title>${title.replace(/[<>&"]/g, '')}</title>
${collectHostStyles()}
<style>
html, body { margin: 0; padding: 0; background: #ffffff; }
${css}
</style>
</head>
<body><div class="md-doc">${html}</div></body>
</html>`;

  document.body.appendChild(iframe);
}

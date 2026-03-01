import * as pdfjsLib from 'pdfjs-dist';

// Worker is copied to public/ and output as /pdf.worker.min.mjs
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs');

export interface RenderedPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  textLayer: HTMLDivElement;
}

/** Load and render a PDF document */
export async function renderPdf(
  url: string,
  container: HTMLElement,
  scale = 1.5
): Promise<RenderedPage[]> {
  const loadingTask = pdfjsLib.getDocument(url);
  const pdf = await loadingTask.promise;
  const pages: RenderedPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    // Page wrapper
    const pageDiv = document.createElement('div');
    pageDiv.className = 'glownote-pdf-page';
    pageDiv.style.position = 'relative';
    pageDiv.style.width = `${viewport.width}px`;
    pageDiv.style.height = `${viewport.height}px`;
    pageDiv.style.margin = '16px auto';

    // Canvas layer (visual rendering)
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.display = 'block';
    pageDiv.appendChild(canvas);

    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Text layer (invisible selectable text on top of canvas)
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'glownote-pdf-text-layer';
    pageDiv.appendChild(textLayerDiv);

    const textContent = await page.getTextContent();

    // Manually place text spans using the viewport-transformed coordinates.
    // viewport.transform converts PDF coords (y-up) to CSS coords (y-down),
    // so tx[4]=x and tx[5]=y are directly usable as CSS left/top.
    for (const item of textContent.items) {
      if (!('str' in item) || !item.str) continue;

      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);

      // Font height from the vertical component of the transform matrix
      const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

      const span = document.createElement('span');
      span.textContent = item.str;
      span.style.position = 'absolute';
      span.style.left = `${tx[4]}px`;
      // tx[5] is the baseline in CSS space; subtract fontHeight to get the top edge
      span.style.top = `${tx[5] - fontHeight}px`;
      span.style.fontSize = `${fontHeight}px`;
      span.style.fontFamily = 'sans-serif';
      span.style.color = 'transparent';
      span.style.whiteSpace = 'pre';
      span.style.transformOrigin = '0% 0%';

      textLayerDiv.appendChild(span);
    }

    container.appendChild(pageDiv);
    pages.push({ pageNumber: i, canvas, textLayer: textLayerDiv });
  }

  return pages;
}

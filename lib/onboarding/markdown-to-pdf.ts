import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { marked } from "marked";

const WRAPPER_CLASS = "regula-profile-pdf-export";

const PDF_CSS = `
.${WRAPPER_CLASS} {
  box-sizing: border-box;
  width: 100%;
  max-width: 720px;
  padding: 32px 40px;
  background: #fafbfc;
  color: #0f172a;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 13px;
  line-height: 1.55;
}
.${WRAPPER_CLASS} h1 {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 8px 0;
  color: #0c1e3c;
  border-bottom: 3px solid #2563eb;
  padding-bottom: 12px;
}
.${WRAPPER_CLASS} h2 {
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #1e3a8a;
  margin: 28px 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid #cbd5e1;
}
.${WRAPPER_CLASS} h3 {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 18px 0 10px 0;
}
.${WRAPPER_CLASS} p { margin: 8px 0; }
.${WRAPPER_CLASS} em, .${WRAPPER_CLASS} i { color: #64748b; font-size: 12px; }
.${WRAPPER_CLASS} hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 20px 0;
}
.${WRAPPER_CLASS} table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0 16px 0;
  font-size: 12px;
}
.${WRAPPER_CLASS} th,
.${WRAPPER_CLASS} td {
  border: 1px solid #e2e8f0;
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}
.${WRAPPER_CLASS} th {
  background: #f1f5f9;
  font-weight: 600;
  color: #334155;
}
.${WRAPPER_CLASS} tr:nth-child(even) td { background: #f8fafc; }
.${WRAPPER_CLASS} ul { margin: 8px 0; padding-left: 22px; }
.${WRAPPER_CLASS} li { margin: 4px 0; }
.${WRAPPER_CLASS} blockquote {
  margin: 10px 0;
  padding: 10px 14px;
  border-left: 4px solid #3b82f6;
  background: #eff6ff;
  color: #1e3a8a;
}
.${WRAPPER_CLASS} strong { color: #0f172a; }
`;

function addPdfPagesFromCanvas(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  imgWidthMm: number,
): void {
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
  const imgData = canvas.toDataURL("image/png", 1.0);
  let heightLeft = imgHeightMm;
  let y = 0;

  pdf.addImage(imgData, "PNG", 0, y, imgWidthMm, imgHeightMm);
  heightLeft -= pageHeightMm;

  while (heightLeft > 0) {
    y = heightLeft - imgHeightMm;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, y, imgWidthMm, imgHeightMm);
    heightLeft -= pageHeightMm;
  }
}

/**
 * Renders Markdown to HTML, lays it out with print-oriented styles, rasterizes to a PDF, and triggers download.
 */
export async function downloadMarkdownAsPdf(
  markdown: string,
  filename: string,
): Promise<void> {
  const html = await marked.parse(markdown, { async: true });

  const host = document.createElement("div");
  host.setAttribute(
    "style",
    "position:fixed;left:0;top:0;width:800px;pointer-events:none;opacity:0;z-index:-1;",
  );

  const styleEl = document.createElement("style");
  styleEl.textContent = PDF_CSS;

  const root = document.createElement("div");
  root.className = WRAPPER_CLASS;
  root.innerHTML = typeof html === "string" ? html : String(html);

  host.appendChild(styleEl);
  host.appendChild(root);
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#fafbfc",
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    addPdfPagesFromCanvas(pdf, canvas, pageWidth);
    pdf.save(filename);
  } finally {
    document.body.removeChild(host);
  }
}

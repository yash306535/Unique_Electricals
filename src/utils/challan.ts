import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Expense } from '../types';

// Fixed business details (from the Unique Electricals delivery challan).
const COMPANY = {
  name: 'Unique Electricals and Enterprises',
  tagline1: 'GOVT. LICENCED ELECTRICAL CONTRACTOR',
  tagline2: 'H.T., L.T., T.F. And Street light WORK SPECIALIST',
  address:
    'Alankapuram Society, Phase-3, Flat No. 111, C Wing, Wadmukhwadi, Pune-412105',
  email: 'pravinrokade4466@gmail.com',
  pan: 'CDTPR6762G',
  gstn: '27CDTPR6762G1ZQ',
  mobile: '8928794644 / 9545304644',
};

const escapeHtml = (s: any): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const inr = (n: number) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

// Per-category colours, mirroring the palette used on the Expenses screen so
// the printed challan matches the app.
const CATEGORY_COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  labour: { bg: '#FFEBEB', fg: '#B5342A', dot: '#FF6B6B' },
  transport: { bg: '#E2F7F5', fg: '#0F6F66', dot: '#4ECDC4' },
  equipment: { bg: '#FFF6D6', fg: '#8A6A08', dot: '#E9C41F' },
  misc: { bg: '#E8F7F1', fg: '#166F55', dot: '#95E1D3' },
};
const DEFAULT_CATEGORY = { bg: '#EEF2F7', fg: '#33556E', dot: '#8FA9C0' };

const categoryStyle = (category: string) =>
  CATEGORY_COLORS[(category || '').toLowerCase()] || DEFAULT_CATEGORY;

// Secondary detail line under the category (labour count / transport / notes).
const detailsFor = (e: Expense): string => {
  const parts: string[] = [];
  if (e.labour_count) parts.push(`${e.labour_count} labour`);
  if (e.transport_name) parts.push(escapeHtml(e.transport_name));
  if (e.description) parts.push(escapeHtml(e.description));
  return parts.join(' • ');
};

export const buildExpenseChallanHtml = (
  siteName: string,
  expenses: Expense[]
): string => {
  const total = expenses.reduce(
    (sum, e) => sum + parseFloat(String(e.amount || 0)),
    0
  );

  const rows = expenses
    .map((e, i) => {
      const detail = detailsFor(e);
      const c = categoryStyle(e.category);
      return `
      <tr>
        <td class="c">${i + 1}</td>
        <td>
          <span class="pill" style="background:${c.bg};color:${c.fg};">
            <span class="dot" style="background:${c.dot};"></span>${escapeHtml(
              (e.category || 'expense').toUpperCase()
            )}
          </span>
          ${detail ? `<div class="note">${detail}</div>` : ''}
        </td>
        <td class="date">${formatDate(e.date)}</td>
        <td class="r amt">${inr(e.amount)}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      color: #1a1a1a; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .frame { border: 2px solid #0f2a44; border-radius: 2px; overflow: hidden; }

    .head { display:flex; justify-content:space-between; align-items:flex-start;
            padding:16px 18px; background:#0f2a44; color:#fff; gap:16px; }
    .brand { font-size: 25px; font-weight: 800; letter-spacing:.3px; line-height:1.15; }
    .sub  { font-size: 10.5px; font-weight: 700; opacity:.92; margin-top:3px; letter-spacing:.2px; }
    .addr { font-size: 10.5px; margin-top:2px; opacity:.85; }
    .contact { font-size: 10.5px; text-align:right; white-space:nowrap; line-height:1.7; opacity:.95; }
    .contact b { display:block; font-size:12px; opacity:1; }

    .title { text-align:center; font-weight:800; letter-spacing:3px; font-size:14px;
             padding:8px; background:#e8eef5; color:#0f2a44; border-bottom:1px solid #c8d4e0; }

    .meta { display:flex; justify-content:space-between; gap:12px;
            padding:11px 18px; font-size:12.5px; background:#fafbfc; border-bottom:1px solid #d8e0e8; }
    .meta .lbl { color:#5b6b7c; font-size:10px; text-transform:uppercase; letter-spacing:.6px; }
    .meta .val { font-weight:700; margin-top:2px; }

    /* Colour accent stripe under the header band */
    .accent { height:5px; background:linear-gradient(90deg,#FF6B6B 0%,#E9C41F 33%,#4ECDC4 66%,#0f2a44 100%); }

    table { width:100%; border-collapse:collapse; }
    thead th { background:#f0f3f7; color:#0f2a44; font-size:10.5px; letter-spacing:.7px;
               text-transform:uppercase; padding:9px 10px; border-bottom:1.5px solid #c8d4e0; text-align:left; }
    tbody td { padding:10px; font-size:12.5px; border-bottom:1px solid #eaeef2; vertical-align:top; }
    tbody tr:nth-child(even) td { background:#fafbfd; }
    .c { text-align:center; width:42px; color:#7a8a9a; font-weight:700; }
    .r { text-align:right; white-space:nowrap; }
    .w-date { width:110px; }
    .w-amt  { width:120px; }
    .date { color:#5b6b7c; font-size:11.5px; }
    .amt  { font-weight:700; color:#0f2a44; font-size:13px; }

    /* Coloured category pill (matches the app's category colours) */
    .pill { display:inline-block; padding:3px 10px 3px 8px; border-radius:11px;
            font-size:10.5px; font-weight:800; letter-spacing:.5px; white-space:nowrap; }
    .dot  { display:inline-block; width:6px; height:6px; border-radius:50%;
            margin-right:6px; vertical-align:middle; }
    .note { color:#5b6b7c; font-size:11px; margin-top:4px; }

    .total td { background:#0f2a44 !important; color:#fff !important; font-weight:800;
                font-size:14.5px; border-bottom:none; padding:13px 10px; letter-spacing:.4px; }
    .total .r { color:#8ee6c8 !important; font-size:16px; }

    /* Generous breathing room so there is real space to sign. */
    .foot { display:flex; justify-content:space-between; gap:40px; padding:0 18px 18px; }
    .sig  { width:250px; padding-top:86px; }
    .sig.right { text-align:right; }
    .sigline { border-top:1.5px dotted #7a8a9a; margin-bottom:7px; }
    .siglabel { font-size:11.5px; font-weight:700; color:#0f2a44; }
    .sigsub { font-size:10px; color:#7a8a9a; margin-top:2px; }
  </style></head><body>
    <div class="frame">
      <div class="head">
        <div>
          <div class="brand">${COMPANY.name}</div>
          <div class="sub">${COMPANY.tagline1}</div>
          <div class="sub">${COMPANY.tagline2}</div>
          <div class="addr">${COMPANY.address}</div>
          <div class="addr">PAN: ${COMPANY.pan} &nbsp;•&nbsp; GSTN: ${COMPANY.gstn}</div>
        </div>
        <div class="contact">
          <b>${COMPANY.mobile.split(' / ')[0]}</b>
          ${COMPANY.mobile.split(' / ')[1] || ''}<br/>
          ${COMPANY.email}
        </div>
      </div>

      <div class="accent"></div>

      <div class="title">EXPENSE CHALLAN</div>

      <div class="meta">
        <div><div class="lbl">Site</div><div class="val">${escapeHtml(siteName)}</div></div>
        <div><div class="lbl">Items</div><div class="val">${expenses.length}</div></div>
        <div><div class="lbl">Date</div><div class="val">${formatDate(new Date())}</div></div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="c">SR</th>
            <th>Particulars</th>
            <th class="w-date">Date</th>
            <th class="r w-amt">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4" class="c">No expenses selected</td></tr>'}
          <tr class="total">
            <td></td><td>TOTAL</td><td></td><td class="r">${inr(total)}</td>
          </tr>
        </tbody>
      </table>

      <div class="foot">
        <div class="sig">
          <div class="sigline"></div>
          <div class="siglabel">Receiver's Signature &amp; Rubber Stamp</div>
        </div>
        <div class="sig right">
          <div class="sigline"></div>
          <div class="siglabel">For ${COMPANY.name}</div>
          <div class="sigsub">Authorised Signatory</div>
        </div>
      </div>
    </div>
  </body></html>`;
};

// expo-print's web implementation is a stub — both print() and
// printToFileAsync() just call window.print(), which prints the CURRENT page
// and ignores the supplied html. So on web (and inside the Electron desktop
// app) we render the challan into a hidden iframe and print that instead,
// letting the user "Save as PDF".
const printHtmlOnWeb = (html: string): Promise<void> =>
  new Promise((resolve) => {
    const doc: any = (globalThis as any).document;
    if (!doc) {
      resolve();
      return;
    }

    const iframe: any = doc.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    doc.body.appendChild(iframe);

    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      // Keep the frame alive briefly so the print dialog can read it.
      setTimeout(() => {
        try {
          iframe.remove();
        } catch {
          /* already detached */
        }
      }, 1000);
      resolve();
    };

    const doPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch {
        /* printing blocked — nothing more we can do */
      }
      cleanup();
    };

    try {
      const frameDoc = iframe.contentWindow.document;
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();
      // Give the document a tick to lay out before printing.
      iframe.onload = doPrint;
      setTimeout(doPrint, 400);
    } catch {
      cleanup();
    }
  });

// Generate the challan and hand it to the user (share sheet on native,
// print / save-as-PDF dialog on web + desktop).
export const downloadChallan = async (html: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await printHtmlOnWeb(html);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Expense Challan',
      UTI: 'com.adobe.pdf',
    });
  }
};

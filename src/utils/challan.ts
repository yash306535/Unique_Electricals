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

// Compose the "Particulars" text for one expense row.
const particularsFor = (e: Expense): string => {
  const parts: string[] = [e.category ? e.category.toUpperCase() : 'EXPENSE'];
  if (e.labour_count) parts.push(`${e.labour_count} labour`);
  if (e.transport_name) parts.push(escapeHtml(e.transport_name));
  if (e.description) parts.push(escapeHtml(e.description));
  return parts.join(' — ');
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
    .map(
      (e, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${particularsFor(e)}</td>
        <td class="r">${formatDate(e.date)}</td>
        <td class="r">${inr(e.amount)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 24px; }
    .frame { border: 2px solid #111; }
    .head { display:flex; justify-content:space-between; padding:10px 14px; border-bottom:2px solid #111; }
    .brand { font-size: 24px; font-weight: 800; }
    .sub { font-size: 11px; font-weight: 700; }
    .addr { font-size: 11px; margin-top: 3px; }
    .mob { font-size: 11px; text-align: right; white-space: nowrap; }
    .title { text-align:center; font-weight:800; letter-spacing:1px; padding:4px; border-bottom:2px solid #111; background:#f2f2f2; }
    .meta { display:flex; justify-content:space-between; padding:8px 14px; border-bottom:2px solid #111; font-size:13px; }
    table { width:100%; border-collapse: collapse; }
    th, td { border:1px solid #111; padding:8px 10px; font-size:13px; }
    th { background:#f2f2f2; }
    td.c, th.c { text-align:center; width:44px; }
    td.r { text-align:right; }
    .total td { font-weight:800; font-size:14px; background:#f7f7f7; }
    .foot { display:flex; justify-content:space-between; padding:26px 14px 10px; font-size:12px; }
  </style></head><body>
    <div class="frame">
      <div class="head">
        <div>
          <div class="brand">${COMPANY.name}</div>
          <div class="sub">${COMPANY.tagline1}</div>
          <div class="sub">${COMPANY.tagline2}</div>
          <div class="addr">Add.: ${COMPANY.address}</div>
          <div class="addr">Email: ${COMPANY.email}</div>
          <div class="addr">PAN: ${COMPANY.pan} &nbsp; GSTN: ${COMPANY.gstn}</div>
        </div>
        <div class="mob">Mob.: ${COMPANY.mobile}</div>
      </div>
      <div class="title">EXPENSE CHALLAN</div>
      <div class="meta">
        <div><b>Site:</b> ${escapeHtml(siteName)}</div>
        <div><b>Date:</b> ${formatDate(new Date())}</div>
      </div>
      <table>
        <thead>
          <tr><th class="c">SR</th><th>PARTICULARS</th><th class="r">DATE</th><th class="r">AMOUNT</th></tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4" class="c">No expenses</td></tr>'}
          <tr class="total"><td></td><td>TOTAL</td><td></td><td class="r">${inr(total)}</td></tr>
        </tbody>
      </table>
      <div class="foot">
        <div>Receiver's Signature &amp; Rubber Stamp</div>
        <div>For ${COMPANY.name}</div>
      </div>
    </div>
  </body></html>`;
};

// Generate the PDF and hand it to the user (share sheet on native,
// browser print/save-as-PDF dialog on web).
export const downloadChallan = async (html: string): Promise<void> => {
  if (Platform.OS === 'web') {
    // printToFileAsync is unsupported on web; printAsync opens the browser
    // print dialog where the user can "Save as PDF".
    await Print.printAsync({ html });
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

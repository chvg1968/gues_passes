import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import type { GuestInfo, ParsedReservation } from './claude'
import { LOGO_B64 } from './logo_b64'

interface PdfData extends ParsedReservation {
  ownerName: string
  signatureDataUrl: string
  signatureDate: string
}

function guestBlock(g: GuestInfo): string {
  return `
    <div class="guest-block">
      <div class="guest-line"><span class="bold">Name of Guest</span>:&nbsp;${g.name}</div>
      <div class="guest-line"><span class="bold">Guest email</span>:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${g.email}</div>
      <div class="guest-line"><span class="bold">Guest telephone</span>:${g.phone}</div>
    </div>`
}

const LOGO_HEADER = `
  <div class="header">
    <img src="${LOGO_B64}" alt="Bahia Beach Resort &amp; Golf Club" />
  </div>`

export async function generateGuestPassPdf(data: PdfData): Promise<Buffer> {
  // Only render guests that have at least a name
  const filledGuests = data.guests.filter(g => g.name.trim().length > 0)
  const guestBlocks = filledGuests.map(guestBlock).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    color: #1a1a1a;
    background: #fff;
  }

  /* ── PAGES ── */
  .page {
    width: 816px;
    min-height: 1056px;
    padding: 48px 64px 48px 64px;
    position: relative;
  }
  .page-break {
    page-break-before: always;
    break-before: always;
  }

  /* ── HEADER / LOGO ── */
  .header {
    text-align: center;
    margin-bottom: 20px;
  }
  .header img {
    width: 170px;
    display: block;
    margin: 0 auto;
  }

  /* ── TITLE ── */
  .title {
    text-align: center;
    font-size: 20pt;
    font-weight: bold;
    line-height: 1.25;
    margin-bottom: 18px;
  }

  /* ── INTRO ── */
  .intro {
    font-size: 9.5pt;
    line-height: 1.55;
    text-align: justify;
    margin-bottom: 20px;
  }
  .intro a { color: #1a1a1a; text-decoration: underline; }

  /* ── MEMBER ROW ── */
  .member-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
    font-size: 11pt;
    border-bottom: 1px solid #ccc;
    padding-bottom: 10px;
  }

  /* ── GUEST BLOCKS ── */
  .guest-block {
    margin-bottom: 10px;
    font-size: 10pt;
    line-height: 1.5;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .guest-line { margin-bottom: 0; }
  .bold { font-weight: bold; }

  /* ── DATES / FEE — always anchored to page 1 content ── */
  .dates-fee-section {
    break-inside: avoid;
    page-break-inside: avoid;
    margin-top: 22px;
  }
  .dates-row {
    display: flex;
    justify-content: center;
    gap: 100px;
    margin-bottom: 6px;
    font-size: 10.5pt;
  }
  .fee-row {
    text-align: center;
    font-style: italic;
    font-size: 10pt;
  }
  .underline { display: inline-block; border-bottom: 1px solid #333; min-width: 90px; }

  /* ── PAGE 2 ── */
  .received-row {
    display: flex;
    justify-content: space-between;
    font-size: 10.5pt;
    margin-bottom: 32px;
    margin-top: 8px;
  }
  .received-row .field {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }
  .received-row .field-line {
    border-bottom: 1px solid #333;
    min-width: 160px;
    height: 18px;
  }

  /* ── FOOTER NOTE ── */
  .footer-note {
    font-size: 9.5pt;
    line-height: 1.55;
    text-align: justify;
    margin-bottom: 28px;
    color: #222;
  }

  /* ── SIGNATURE ── */
  .signature-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 48px;
    margin-top: 12px;
  }
  .sig-block {
    flex: 1;
    border-top: 1px solid #333;
    padding-top: 4px;
    font-size: 9.5pt;
    color: #444;
  }
  .sig-block.has-sig { border-top: none; }
  .sig-img {
    max-height: 52px;
    max-width: 220px;
    display: block;
    margin-bottom: 2px;
  }
</style>
</head>
<body>

<!-- ══════════════ PAGE 1 ══════════════ -->
<div class="page">

  ${LOGO_HEADER}

  <div class="title">Resort Guest Pass<br/>Form</div>

  <div class="intro">
    The Club will approve a maximum of passes based on the villa type. A nightly resort flat fee will be
    charged per night. Rental guests must be registered by the member with the Membership Office at least
    72 hours prior to the visit. Form must be sent via email to
    <a href="mailto:concierge@bahiapr.com">concierge@bahiapr.com</a>.
    Resort passes will be issued <strong>electronically</strong> to each guest over the age of 14 years
    old via email through <strong>ID123 App</strong> after payment of the passes is completed. If guests
    do not have their Resort Pass the Club will deny access. The Resort pass grants access to all Club
    amenities: Boat house, Tennis Courts, Wellness Center, Beach Club Pool, Aquavento and St. Regis Pool.
  </div>

  <div class="member-row">
    <div><span class="bold">Member's Name:&nbsp;</span>${data.ownerName}</div>
    <div><span class="bold">Unit Number:&nbsp;</span>${data.propertyName}</div>
  </div>

  ${guestBlocks}

  <!-- Dates & fee — kept together, forced onto page 1 via break-inside:avoid -->
  <div class="dates-fee-section">
    <div class="dates-row">
      <div>Arrival Date:&nbsp;&nbsp;<strong>${data.checkIn}</strong></div>
      <div>Departure Date:&nbsp;&nbsp;<strong>${data.checkOut}</strong></div>
    </div>
    <div class="fee-row">
      <em>Daily Resort Fee:</em>&nbsp;<span class="underline"></span>&nbsp;&nbsp;&nbsp;
      <em># of nights:&nbsp;<strong>${data.nights}</strong>&nbsp;&nbsp;$ Total</em>&nbsp;<span class="underline"></span>
    </div>
  </div>

</div>

<!-- ══════════════ PAGE 2 ══════════════ -->
<div class="page page-break">

  ${LOGO_HEADER}

  <!-- Form Request Received / Passes Delivered By -->
  <div class="received-row">
    <div class="field">
      <span class="bold">Form Request Received:</span>
      <div class="field-line">&nbsp;${data.signatureDate}</div>
    </div>
    <div class="field">
      <span class="bold">Passes Delivered By:</span>
      <div class="field-line"></div>
    </div>
  </div>

  <!-- Footer legal note -->
  <div class="footer-note">
    Although it is the intention of the Club to accommodate guests without inconvenience to the members,
    The Club reserves the right to limit the number of rental guests on any given day or over the course
    of the membership year or portion thereof.
    <br/><br/>
    I hereby (a) acknowledge receipt of the number of Resort Passes indicated above and (b) authorize
    the Club at Bahia Beach Resort to charge my account for (i) the Resort Nightly Fee set forth.
  </div>

  <!-- Signature -->
  <div class="signature-row">
    <div class="sig-block ${data.signatureDataUrl ? 'has-sig' : ''}">
      ${data.signatureDataUrl
        ? `<img src="${data.signatureDataUrl}" class="sig-img" alt="Signature"/>`
        : ''}
      <div>Member Signature</div>
    </div>
    <div class="sig-block">
      <div>${data.signatureDate}</div>
      <div>Date</div>
    </div>
  </div>

</div>

</body>
</html>`

  const isLocal = process.env.NODE_ENV === 'development'

  const browser = await puppeteer.launch({
    args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: isLocal ? undefined : await chromium.executablePath(),
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfUint8 = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    })
    return Buffer.from(pdfUint8)
  } finally {
    await browser.close()
  }
}

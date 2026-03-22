import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import type { GuestInfo, ParsedReservation } from './claude'
import { LOGO_B64 } from './logo_b64'

interface PdfData extends ParsedReservation {
  ownerName: string
  signatureDataUrl: string
  signatureDate: string
}

function guestBlock(g: GuestInfo | undefined, index: number): string {
  // First guest gets pre-filled placeholders in the labels area (matching the PDF reference)
  const name = g?.name ?? ''
  const email = g?.email ?? ''
  const phone = g?.phone ?? ''
  return `
    <div class="guest-block">
      <div class="guest-line"><span class="bold">Name of Guest</span>:&nbsp;${name}</div>
      <div class="guest-line"><span class="bold">Guest email</span>:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${email}</div>
      <div class="guest-line"><span class="bold">Guest telephone</span>:${phone}</div>
    </div>`
}

export async function generateGuestPassPdf(data: PdfData): Promise<Buffer> {
  // 8 guest blocks — always render all 8
  const guestBlocks = Array.from({ length: 8 }, (_, i) =>
    guestBlock(data.guests[i], i)
  ).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11.5pt;
    color: #1a1a1a;
    background: #fff;
    padding: 52px 64px 48px 64px;
    width: 816px; /* 8.5in at 96dpi */
  }

  /* ── HEADER ── */
  .header {
    text-align: center;
    margin-bottom: 24px;
  }
  .header img {
    width: 180px;
    display: block;
    margin: 0 auto 0;
  }

  /* ── TITLE ── */
  .title {
    text-align: center;
    font-size: 20pt;
    font-weight: bold;
    line-height: 1.25;
    margin-bottom: 20px;
    font-family: Arial, Helvetica, sans-serif;
  }

  /* ── INTRO PARAGRAPH ── */
  .intro {
    font-size: 10pt;
    line-height: 1.55;
    text-align: justify;
    margin-bottom: 22px;
    font-family: Arial, Helvetica, sans-serif;
  }
  .intro a { color: #1a1a1a; text-decoration: underline; }

  /* ── MEMBER ROW ── */
  .member-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 18px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11.5pt;
  }
  .member-row .bold { font-weight: bold; }

  /* ── GUEST BLOCKS ── */
  .guest-block {
    margin-bottom: 14px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
  }
  .guest-line { margin-bottom: 1px; }
  .bold { font-weight: bold; }

  /* ── BOTTOM DATES ── */
  .dates-row {
    display: flex;
    justify-content: center;
    gap: 120px;
    margin-top: 28px;
    margin-bottom: 8px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
  }

  .fee-row {
    text-align: center;
    font-style: italic;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    margin-bottom: 24px;
  }
  .fee-line { display: inline-block; border-bottom: 1px solid #333; min-width: 80px; }

  /* ── FOOTER NOTE ── */
  .footer-note {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9.5pt;
    line-height: 1.5;
    text-align: justify;
    margin-bottom: 20px;
    color: #222;
  }

  /* ── SIGNATURE ── */
  .signature-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 40px;
    margin-top: 10px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
  }
  .sig-block {
    flex: 1;
    border-top: 1px solid #333;
    padding-top: 4px;
    font-size: 9.5pt;
    color: #444;
  }
  .sig-block.has-sig {
    border-top: none;
  }
  .sig-img {
    max-height: 52px;
    max-width: 220px;
    display: block;
    margin-bottom: 2px;
  }
</style>
</head>
<body>

  <!-- HEADER: Logo -->
  <div class="header">
    <img src="${LOGO_B64}" alt="Bahia Beach Resort & Golf Club" />
  </div>

  <!-- TITLE -->
  <div class="title">Resort Guest Pass<br/>Form</div>

  <!-- INTRO -->
  <div class="intro">
    The Club will approve a maximum of passes based on the villa type. A nightly resort flat fee will be
    charged per night. Rental guests must be registered by the member with the Membership Office at least
    72 hours prior to the visit. Form must be sent via email to
    <a href="mailto:concierge@bahiapr.com">concierge@bahiapr.com</a>.
    Resort passes will be issued <strong>electronically</strong> to each guest over the age of 14 years old
    via email through <strong>ID123 App</strong> after payment of the passes is completed. If guests do not
    have their Resort Pass the Club will deny access. The Resort pass grants access to all Club amenities:
    Boat house, Tennis Courts, Wellness Center, Beach Club Pool, Aquavento and St. Regis Pool.
  </div>

  <!-- MEMBER ROW -->
  <div class="member-row">
    <div><span class="bold">Member's Name: </span>${data.ownerName}</div>
    <div><span class="bold">Unit Number: </span>${data.propertyName}</div>
  </div>

  <!-- GUEST BLOCKS -->
  ${guestBlocks}

  <!-- DATES -->
  <div class="dates-row">
    <div>Arrival Date:&nbsp;&nbsp;<strong>${data.checkIn}</strong></div>
    <div>Departure Date:&nbsp;&nbsp;<strong>${data.checkOut}</strong></div>
  </div>

  <!-- FEE ROW -->
  <div class="fee-row">
    <em>Daily Resort Fee:</em>&nbsp;<span class="fee-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;&nbsp;
    <em># of nights: ${data.nights} &nbsp; $ Total</em>&nbsp;<span class="fee-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
  </div>

  <!-- FOOTER NOTE -->
  <div class="footer-note">
    Although it is the intention of the Club to accommodate guests without inconvenience to the members,
    The Club reserves the right to limit the number of rental guests on any given day or over the course
    of the membership year or portion thereof.
    <br/><br/>
    I hereby (a) acknowledge receipt of the number of Resort Passes indicated above and (b) authorize
    the Club at Bahia Beach Resort to charge my account for (i) the Resort Nightly Fee set forth.
  </div>

  <!-- SIGNATURE -->
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

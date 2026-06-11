import puppeteer from 'puppeteer';
import fs from 'fs';

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Users/Hugo/.cache/puppeteer/chrome/win64-149.0.7827.22/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

// Navigate to report page and wait for everything to render
await page.evaluate(() => showPage('report'));
await new Promise(r => setTimeout(r, 800));

// Scroll through entire report to trigger any lazy rendering
await page.evaluate(async () => {
  const sections = ['rpt-s1','rpt-s2','rpt-s3','rpt-s4','rpt-s5','rpt-s6','rpt-s7'];
  for (const id of sections) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    await new Promise(r => setTimeout(r, 100));
  }
  // Scroll back to top
  document.getElementById('rpt-doc').scrollIntoView({ behavior: 'instant', block: 'start' });
});
await new Promise(r => setTimeout(r, 400));

// Inject print-specific overrides: hide site nav, fix sidebar for print
await page.addStyleTag({ content: `
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  /* Hide everything except the report for PDF */
  nav, .mobile-nav, #page-home, #page-service, #page-tester, #page-book,
  section.hero-section, section.cta-section,
  footer { display: none !important; }
  /* Remove page background */
  body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  #page-report { display: block !important; }
  /* Remove the hero section above the report doc */
  #page-report > section:first-child { display: none !important; }
  /* Make the report fill the page */
  #rpt-doc { padding: 0 !important; background: #fff !important; }
  #rpt-doc > .container { max-width: 100% !important; padding: 0 !important; }
  /* Remove the outer card shadow/border for cleaner PDF */
  #rpt-doc > .container > div { border-radius: 0 !important; box-shadow: none !important; border: none !important; }
  /* Ensure sidebar stays visible */
  .rpt-doc-body { min-height: unset !important; }
  /* Keep section backgrounds */
  .rpt-section-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rpt-section-dk { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
` });

await new Promise(r => setTimeout(r, 300));

const pdf = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  scale: 0.75,
});

fs.writeFileSync('./sample-report.pdf', pdf);
await browser.close();

console.log('PDF saved: sample-report.pdf (' + Math.round(pdf.length / 1024) + ' KB)');

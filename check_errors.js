const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('BROWSER ERR:', msg.text());
    });
    page.on('pageerror', err => {
        console.log('PAGE ERR:', err.message);
    });
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    await browser.close();
})();

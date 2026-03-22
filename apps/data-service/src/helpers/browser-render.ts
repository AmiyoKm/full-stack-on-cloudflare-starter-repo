import puppeteer from '@cloudflare/puppeteer';

export async function collectDestinationInfo(env: Env, destinationUrl: string) {
	const browser = await puppeteer.launch(env.VIRTUAL_BROWSER);
	const page = await browser.newPage();
	const response = await page.goto(destinationUrl, { referrerPolicy: 'no-referrer' });

	await page.waitForNetworkIdle();

	const bodyText = (await page.$eval('body', (el) => el.innerText)) as string;
	const html = await page.content();

	const screenshot = await page.screenshot({ encoding: 'base64' });
	const screenshotDataUrl = `data:image/png;base64,${screenshot}`;

	await browser.close();
	const status = response ? response.status() : 0;

	return {
		bodyText,
		html,
		status,
		screenshotDataUrl,
	};
}

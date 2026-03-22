import { DurableObject } from 'cloudflare:workers';

interface ClickData {
	accountId: string;
	linkId: string;
	destinationUrl: string;
	destinationCountryCode: string;
}

const EVALUATION_INTERVAL = 3 * 24 * 60 * 60 * 1000;
const CLICK_DATA_STORAGE_KEY = 'click_data';

export class EvaluationSchedular extends DurableObject<Env> {
	clickData: ClickData | undefined;
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		ctx.blockConcurrencyWhile(async () => {
			this.clickData = await ctx.storage.get<ClickData>(CLICK_DATA_STORAGE_KEY);
		});
	}

	async collectLinkClick(clickData: ClickData) {
		this.clickData = clickData;
		await this.ctx.storage.put(CLICK_DATA_STORAGE_KEY, clickData);

		const alarm = await this.ctx.storage.getAlarm();
		if (alarm) return;

		await this.ctx.storage.setAlarm(Date.now() + EVALUATION_INTERVAL);
	}

	async alarm() {
		console.log('Evaluating destination for click data:', this.clickData);
		if (!this.clickData) {
			console.warn('No click data found for evaluation.');
			throw new Error('No click data to evaluate');
		}

		await this.env.DESTINATION_EVALUATION_WORKFLOW.create({
			params: {
				accountId: this.clickData.accountId,
				linkId: this.clickData.linkId,
				destinationUrl: this.clickData.destinationUrl,
			},
		});
	}
}

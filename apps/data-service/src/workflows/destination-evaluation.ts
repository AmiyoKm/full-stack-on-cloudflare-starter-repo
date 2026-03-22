import { aiDestinationChecker } from '@/helpers/ai-destination-checker';
import { collectDestinationInfo } from '@/helpers/browser-render';
import { initDatabase } from '@repo/data-ops/database';
import { addEvaluation } from '@repo/data-ops/queries/evaluations';
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

export class DestinationEvaluationWorkflow extends WorkflowEntrypoint<Env, DestinationStatusEvalutationParams> {
	async run(event: Readonly<WorkflowEvent<DestinationStatusEvalutationParams>>, step: WorkflowStep) {
		const collectedData = await step.do('collect rendered destination page data', async () => {
			return collectDestinationInfo(this.env, event.payload.destinationUrl);
		});

		const aiStatus = await step.do('Use AI to check status of page', async () => {
			return aiDestinationChecker(this.env, collectedData.bodyText);
		});

		initDatabase(this.env.DB);
		const evaluationId = await step.do('Save evaluation in database', async () => {
			return await addEvaluation({
				linkId: event.payload.linkId,
				status: aiStatus.status,
				reason: aiStatus.statusReason,
				accountId: event.payload.accountId,
				destinationUrl: event.payload.destinationUrl,
			});
		});

		await step.do('Backup destination HTML in R2', async () => {
			const accountId = event.payload.accountId;
			const r2pathHtml = `evaluations/${accountId}/html/${evaluationId}.html`;
			const r2pathText = `evaluations/${accountId}/text/${evaluationId}.txt`;
			const r2PathScreenshot = `evaluations/${accountId}/screenshots/${evaluationId}.png`;

			const screenshotBase64 = collectedData.screenshotDataUrl.replace(/^data:image\/png;base64,/, '');
			const screenshotBuffer = Buffer.from(screenshotBase64, 'base64');

			await this.env.BUCKET.put(r2pathHtml, collectedData.html);
			await this.env.BUCKET.put(r2pathText, collectedData.bodyText);
			await this.env.BUCKET.put(r2PathScreenshot, screenshotBuffer);
		});
	}
}

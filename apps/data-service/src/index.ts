import { initDatabase } from '@repo/data-ops/database';
import { QueueMessageSchema, QueueMessageType } from '@repo/data-ops/zod-schema/queue';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { app } from './hono/app';
import { handleLinkClick } from './queue-handlers/link-clicks';
export { EvaluationSchedular } from './durable-objects/evaluations-schedular';
export { LinkClickTracker } from './durable-objects/link-click-tracker';
export { DestinationEvaluationWorkflow } from './workflows/destination-evaluation';

export default class DataService extends WorkerEntrypoint<Env> {
	constructor(ctx: ExecutionContext, env: Env) {
		super(ctx, env);
		initDatabase(env.DB);
	}
	fetch(request: Request) {
		return app.fetch(request, this.env, this.ctx);
	}
	async queue(batch: MessageBatch<QueueMessageType>): Promise<void> {
		for (const message of batch.messages) {
			const parsedEvent = QueueMessageSchema.safeParse(message.body);
			if (!parsedEvent.success) {
				console.error('Failed to parse queue message:', parsedEvent.error);
				continue;
			}

			const event = parsedEvent.data;
			if (event.type === 'LINK_CLICK') {
				await handleLinkClick(this.env, event);
			}
		}
	}
	scheduled(controller: ScheduledController): void | Promise<void> {}
}

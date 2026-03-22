import { deleteClicksBefore, getRecentClicks } from '@/helpers/durable-queries';
import { DurableObject } from 'cloudflare:workers';
import moment from 'moment';

export class LinkClickTracker extends DurableObject {
	sql: SqlStorage;
	leastRecentOffsetTime = 0;
	mostRecentOffsetTime = 0;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;

		ctx.blockConcurrencyWhile(async () => {
			const [leastRecent, mostRecent] = await Promise.all([
				ctx.storage.get<number>('leastRecentOffsetTime'),
				ctx.storage.get<number>('mostRecentOffsetTime'),
			]);

			this.leastRecentOffsetTime = leastRecent || 0;
			this.mostRecentOffsetTime = mostRecent || 0;

			const query = `
                CREATE TABLE IF NOT EXISTS geo_link_clicks (
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    country TEXT NOT NULL,
                    time INTEGER NOT NULL
                )
            `;

			this.sql.exec(query);
		});
	}

	async addClick(latitude: number, longitude: number, country: string, time: number) {
		const query = `
			INSERT INTO geo_link_clicks (latitude, longitude, country, time)
			VALUES (?, ?, ?, ?)
		`;
		this.sql.exec(query, latitude, longitude, country, time);

		const alarm = await this.ctx.storage.getAlarm();
		if (alarm) return;

		await this.ctx.storage.setAlarm(moment().add(2, 'second').valueOf());
	}

	async alarm() {
		console.log('alarm');
		const clickData = getRecentClicks(this.sql, this.mostRecentOffsetTime, 100);
		const sockets = this.ctx.getWebSockets();

		for (const socket of sockets) {
			socket.send(JSON.stringify(clickData.clicks));
		}

		await this.flushOffsetTimes(clickData.mostRecentTime, clickData.oldestTime);
		deleteClicksBefore(this.sql, clickData.oldestTime);
	}

	async flushOffsetTimes(mostRecentOffsetTime: number, leastRecentOffsetTime: number) {
		this.mostRecentOffsetTime = mostRecentOffsetTime;
		this.leastRecentOffsetTime = leastRecentOffsetTime;

		await Promise.all([
			this.ctx.storage.put('mostRecentOffsetTime', mostRecentOffsetTime),
			this.ctx.storage.put('leastRecentOffsetTime', leastRecentOffsetTime),
		]);
	}

	async fetch(_: Request) {
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		this.ctx.acceptWebSocket(server);
		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}
	webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void | Promise<void> {
		console.log('Received message:', message);
	}
	webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void> {
		console.log('WebSocket closed:', { code, reason, wasClean });
	}
	webSocketError(ws: WebSocket, error: unknown): void | Promise<void> {
		console.error('WebSocket error:', error);
	}
}

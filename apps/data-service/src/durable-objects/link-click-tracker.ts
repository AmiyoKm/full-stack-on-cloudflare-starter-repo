import { DurableObject } from 'cloudflare:workers';

export class LinkClickTracker extends DurableObject {
	sql: SqlStorage;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;

		ctx.blockConcurrencyWhile(async () => {
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
	}

	async fetch(_: Request) {
		const query = `
			SELECT *
			FROM geo_link_clicks
			limit 100
		`;

		const cursor = this.sql.exec(query);
		const results = cursor.toArray();

		return new Response(
			JSON.stringify({
				clicks: results,
			}),
			{
				headers: {
					'Content-Type': 'application/json',
				},
			},
		);
	}
}

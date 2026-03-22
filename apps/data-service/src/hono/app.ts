import { captureLinkClickInBackground, getDestinationForCountry, getRoutingDestinations } from '@/helpers/route-ops';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';
import { Hono } from 'hono';

export const app = new Hono<{ Bindings: Env }>();

app.get('/link-click/:accountId', async (c) => {
	const { accountId } = c.req.param();
	const doId = c.env.LINK_CLICK_TRACKER_OBJECT.idFromName(accountId);
	const durableObject = c.env.LINK_CLICK_TRACKER_OBJECT.get(doId);
	return durableObject.fetch(c.req.raw);
});

app.get('/:id', async (c) => {
	const { id } = c.req.param();

	const link = await getRoutingDestinations(c.env, id);
	if (!link) {
		return c.text('Link not found', 404);
	}

	const cloudflareHeaders = cloudflareInfoSchema.safeParse(c.req.raw.cf);
	if (!cloudflareHeaders.success) {
		return c.text('Invalid Cloudflare headers', 400);
	}

	const headers = cloudflareHeaders.data;
	const destinations = getDestinationForCountry(link, headers.country);

	const queueMessage: LinkClickMessageType = {
		type: 'LINK_CLICK',
		data: {
			accountId: link.accountId,
			id: id,
			country: headers.country,
			destination: destinations,
			latitude: headers.latitude,
			longitude: headers.longitude,
			timestamp: new Date().toISOString(),
		},
	};
	c.executionCtx.waitUntil(captureLinkClickInBackground(c.env, queueMessage));

	return c.redirect(destinations, 301);
});

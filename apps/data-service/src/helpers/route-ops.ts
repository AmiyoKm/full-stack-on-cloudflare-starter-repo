import { getLink } from '@repo/data-ops/queries/links';
import { linkSchema, LinkSchemaType } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';

async function getLinkInfoFromKV(env: Env, id: string) {
	const link = await env.KV.get(id);
	if (!link) {
		return null;
	}
	try {
		const parsedLink = JSON.parse(link);
		return linkSchema.parse(parsedLink);
	} catch (error) {
		console.error('Error parsing link from KV:', error);
		return null;
	}
}

const KV_TTL_SECONDS = 60 * 60;

async function setLinkInfoToKV(env: Env, id: string, linkInfo: LinkSchemaType) {
	try {
		const stringifiedLink = JSON.stringify(linkInfo);
		await env.KV.put(id, stringifiedLink, {
			expirationTtl: KV_TTL_SECONDS,
		});
	} catch (error) {
		console.error('Error setting link info in KV:', error);
		throw error;
	}
}

export async function getRoutingDestinations(env: Env, id: string) {
	const link = await getLinkInfoFromKV(env, id);
	if (link) return link;

	const linkFromDb = await getLink(id);
	if (!linkFromDb) {
		return null;
	}

	await setLinkInfoToKV(env, id, linkFromDb);
	return linkFromDb;
}

export function getDestinationForCountry(linkInfo: LinkSchemaType, countryCode?: string) {
	if (!countryCode) {
		return linkInfo.destinations.default;
	}

	if (linkInfo.destinations[countryCode]) {
		return linkInfo.destinations[countryCode];
	}

	return linkInfo.destinations.default;
}

export async function scheduleEvaluationWorkflow(env: Env, event: LinkClickMessageType) {
	const doId = env.EVALUATION_SCHEDULAR.idFromName(`${event.data.id}:${event.data.destination}`);
	const durableObject = env.EVALUATION_SCHEDULAR.get(doId);

	await durableObject.collectLinkClick({
		accountId: event.data.accountId,
		linkId: event.data.id,
		destinationUrl: event.data.destination,
		destinationCountryCode: event.data.country || 'UNKNOWN',
	});
}

export async function captureLinkClickInBackground(env: Env, event: LinkClickMessageType) {
	await env.QUEUE.send(event);

	const doId = env.LINK_CLICK_TRACKER_OBJECT.idFromName(event.data.accountId);
	const durableObject = env.LINK_CLICK_TRACKER_OBJECT.get(doId);

	if (!event.data.latitude || !event.data.longitude || !event.data.country) return;

	await durableObject.addClick(event.data.latitude, event.data.longitude, event.data.country, Date.now());
}

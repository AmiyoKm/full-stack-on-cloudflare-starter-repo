import { Hono } from 'hono';

export const app = new Hono<{ Bindings: Env }>();

app.get('/:id', async (c) => {
	const { id } = c.req.param();

	return c.text(`Hello, ${id}!`);
});

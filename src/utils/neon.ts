import { Client, QueryResult, QueryResultRow } from "@neondatabase/serverless";

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});

	await client.connect();

	try {
		return await client.query<T>(text, params);
	} finally {
		await client.end();
	}
}

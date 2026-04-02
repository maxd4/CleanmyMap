import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "@/lib/env";

let client: Pinecone | null = null;

export function getPineconeClient() {
  if (!env.PINECONE_API_KEY) return null;
  if (client) return client;

  client = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  return client;
}

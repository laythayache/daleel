/**
 * Client for the Daleel-Backend public "N" API (normalized items ingested from
 * Telegram channels). Separate from api-client.ts which talks to the in-repo
 * election backend — this one hits an external service whose URL is configured
 * via NEXT_PUBLIC_DALEEL_API_URL.
 */

export type NItem = {
  id: number;
  title: string;
  summary: string;
  body: string;
  imageUrl: string | null;
  sourceUrl: string;
  sourceName: string;
  politicalOrientation: string | null;
  category: string;
  tags: string[];
  sentiment: string | null;
  entities: unknown[];
  isWarning: boolean;
  status: string;
  language: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  fetchedAt: string;
};

type ListResponse = {
  success: true;
  data: NItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const BASE_URL =
  process.env.NEXT_PUBLIC_DALEEL_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

async function nFetch<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`Daleel N API ${res.status} ${res.statusText} — ${path}`);
  }
  return res.json();
}

export async function getLatestItems(
  params: { page?: number; pageSize?: number } = {},
): Promise<ListResponse> {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  const query = sp.toString();
  return nFetch<ListResponse>(`/api/n/latest${query ? `?${query}` : ""}`);
}

export async function getItemById(id: number | string): Promise<NItem | null> {
  try {
    const res = await nFetch<{ success: true; data: NItem }>(
      `/api/n/${encodeURIComponent(String(id))}`,
      60,
    );
    return res.data;
  } catch (err) {
    // 404s are a normal "not found", not an error to surface
    if ((err as Error).message.includes(" 404 ")) return null;
    throw err;
  }
}

export async function getItems(
  params: {
    page?: number;
    pageSize?: number;
    category?: string;
    tag?: string;
    language?: string;
    q?: string;
  } = {},
): Promise<ListResponse> {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.category) sp.set("category", params.category);
  if (params.tag) sp.set("tag", params.tag);
  if (params.language) sp.set("language", params.language);
  if (params.q) sp.set("q", params.q);
  const query = sp.toString();
  return nFetch<ListResponse>(`/api/n/list${query ? `?${query}` : ""}`);
}

const STORAGE_PREFIX = 'karakoram-query:v1:';

// Only public, non-personal queries are persisted. These are the queries that
// make the first paint feel slow when the API or Cloudinary is cold.
const PERSISTED_QUERIES = [
  { key: ['site-settings'], ttl: 10 * 60_000 },
  { key: ['categories'], ttl: 24 * 60 * 60_000 },
  { key: ['cities'], ttl: 24 * 60 * 60_000 },
  { key: ['products', 'featured'], ttl: 30 * 60_000 },
];

const serializeKey = (key) => JSON.stringify(key);
const storageKey = (key) => `${STORAGE_PREFIX}${serializeKey(key)}`;
const hasStorage = () => {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
};

const getEntry = (key) => {
  const serialized = serializeKey(key);
  return PERSISTED_QUERIES.find((entry) => serializeKey(entry.key) === serialized);
};

const readPersistedQuery = (key) => {
  if (!hasStorage()) return undefined;
  const entry = getEntry(key);
  if (!entry) return undefined;

  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return undefined;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.savedAt !== 'number') return undefined;

    if (Date.now() - parsed.savedAt > entry.ttl) {
      window.localStorage.removeItem(storageKey(key));
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
};

const writePersistedQuery = (key, data) => {
  if (!hasStorage() || data === undefined) return;
  if (!getEntry(key)) return;

  try {
    window.localStorage.setItem(
      storageKey(key),
      JSON.stringify({ data, savedAt: Date.now() })
    );
  } catch {
    // Private mode or a full quota should never break the storefront.
  }
};

export const seedPersistedQueries = (queryClient) => {
  for (const { key } of PERSISTED_QUERIES) {
    const cached = readPersistedQuery(key);
    if (cached) {
      queryClient.setQueryData(key, cached.data, { updatedAt: cached.savedAt });
    }
  }
};

export const persistQueryUpdates = (queryClient) => {
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return;

    // Successful network responses are the main source of persisted data.
    if (event.action.type === 'success') {
      writePersistedQuery(event.query.queryKey, event.action.data);
      return;
    }

    // The admin settings page writes the new logo directly into the cache.
    // Persist that too so the next page load shows the new logo immediately.
    if (
      event.action.type === 'setState' &&
      event.query.queryKey[0] === 'site-settings' &&
      event.action.state.data
    ) {
      writePersistedQuery(event.query.queryKey, event.action.state.data);
    }
  });
};

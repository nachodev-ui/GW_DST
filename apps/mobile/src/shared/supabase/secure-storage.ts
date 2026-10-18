import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

const manifestSchema = z.object({
  generation: z.string().regex(/^[a-z0-9-]+$/),
  count: z.number().int().min(1).max(256),
});
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const chunkSize = 1800;

async function readManifest(key: string) {
  const value = await SecureStore.getItemAsync(key);
  return value ? manifestSchema.parse(JSON.parse(value)) : null;
}

async function removeChunks(key: string, manifest: z.infer<typeof manifestSchema> | null) {
  if (!manifest) return;
  for (let i = 0; i < manifest.count; i++) {
    await SecureStore.deleteItemAsync(`${key}.${manifest.generation}.${i}`);
  }
}

// ASCII chunks stay below historical Keychain size limits, even for Unicode metadata.
// Publish the manifest last so an interrupted write never exposes a partial session.
export const secureStorage = {
  async getItem(key: string) {
    const manifest = await readManifest(key);
    if (!manifest) return null;
    const chunks: string[] = [];
    for (let i = 0; i < manifest.count; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}.${manifest.generation}.${i}`);
      if (chunk === null) throw new Error('Incomplete secure session');
      chunks.push(chunk);
    }
    const value: unknown = JSON.parse(chunks.join(''));
    return z.string().parse(value);
  },
  async setItem(key: string, value: string) {
    const previous = await readManifest(key);
    const encoded = JSON.stringify(value).replace(
      /[^\x20-\x7E]/g,
      (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
    );
    const manifest = manifestSchema.parse({
      generation: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      count: Math.ceil(encoded.length / chunkSize),
    });
    try {
      for (let i = 0; i < manifest.count; i++) {
        await SecureStore.setItemAsync(
          `${key}.${manifest.generation}.${i}`,
          encoded.slice(i * chunkSize, (i + 1) * chunkSize),
          options,
        );
      }
      await SecureStore.setItemAsync(key, JSON.stringify(manifest), options);
    } catch (error) {
      await removeChunks(key, manifest).catch(() => undefined);
      throw error;
    }
    // Old chunks are unreachable after the manifest swap; cleanup is best effort.
    await removeChunks(key, previous).catch(() => undefined);
  },
  async removeItem(key: string) {
    const manifest = await readManifest(key);
    await SecureStore.deleteItemAsync(key);
    await removeChunks(key, manifest);
  },
};

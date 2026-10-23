import { CryptoDigestAlgorithm, digest, getRandomValues, randomUUID } from 'expo-crypto';

// Supply only the WebCrypto operations Auth JS uses on Hermes, without its
// Math.random / plain-challenge fallback. Existing WebCrypto implementations win.
export function ensurePkceCrypto() {
  const crypto =
    typeof globalThis.crypto === 'object' && globalThis.crypto !== null ? globalThis.crypto : {};
  if (!('getRandomValues' in crypto) || typeof crypto.getRandomValues !== 'function') {
    Object.defineProperty(crypto, 'getRandomValues', { value: getRandomValues });
  }
  if (!('randomUUID' in crypto) || typeof crypto.randomUUID !== 'function') {
    Object.defineProperty(crypto, 'randomUUID', { value: randomUUID });
  }
  const subtle =
    'subtle' in crypto && typeof crypto.subtle === 'object' && crypto.subtle !== null
      ? crypto.subtle
      : {};
  if (!('digest' in subtle) || typeof subtle.digest !== 'function') {
    Object.defineProperty(subtle, 'digest', {
      value: (algorithm: unknown, input: unknown) => {
        const name =
          typeof algorithm === 'string'
            ? algorithm
            : typeof algorithm === 'object' && algorithm !== null && 'name' in algorithm
              ? algorithm.name
              : null;
        if (name !== 'SHA-256') throw new Error('Unsupported Auth digest');
        let bytes: Uint8Array<ArrayBuffer>;
        if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
        else if (ArrayBuffer.isView(input)) {
          bytes = new Uint8Array(input.byteLength);
          bytes.set(new Uint8Array(input.buffer, input.byteOffset, input.byteLength));
        } else throw new Error('Invalid Auth digest input');
        return digest(CryptoDigestAlgorithm.SHA256, bytes);
      },
    });
  }
  if (!('subtle' in crypto) || typeof crypto.subtle !== 'object' || crypto.subtle === null)
    Object.defineProperty(crypto, 'subtle', { value: subtle });
  if (typeof globalThis.crypto !== 'object' || globalThis.crypto === null)
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: crypto });
}

/**
 * E2E Encryption using Web Crypto API.
 * Key pairs are generated client-side. Only public keys are shared via the server.
 * The server never sees plaintext messages or private keys.
 */

const ALGORITHM = { name: 'RSA-OAEP', hash: 'SHA-256' };
const KEY_LENGTH = 2048;

// Generate RSA key pair for E2E encryption
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: KEY_LENGTH,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  return keyPair;
}

// Export public key to PEM format for sharing
export async function exportPublicKey(publicKey) {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  return `-----BEGIN PUBLIC KEY-----\n${base64}\n-----END PUBLIC KEY-----`;
}

// Import a PEM public key
export async function importPublicKey(pem) {
  const base64 = pem.replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  return window.crypto.subtle.importKey(
    'spki',
    binary.buffer,
    ALGORITHM,
    true,
    ['encrypt']
  );
}

// Encrypt message with recipient's public key
export async function encryptMessage(publicKey, message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    data
  );

  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

// Decrypt message with own private key
export async function decryptMessage(privateKey, encryptedBase64) {
  const binary = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    binary.buffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Store keys in IndexedDB for persistence
const DB_NAME = 'voicelink_keys';
const STORE_NAME = 'keys';

function openKeysDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveKeyPair(keyPair) {
  const db = await openKeysDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put({ id: 'keyPair', publicKey: keyPair.publicKey, privateKey: keyPair.privateKey });
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadKeyPair() {
  const db = await openKeysDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.get('keyPair');
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Encrypt/decrypt the SECRET fields of a POS config at the storage boundary.
// Secret fields (API keys/tokens — see PosField.secret in pos.ts) are stored as
// AES-GCM ciphertext (secretbox.ts) instead of plaintext jsonb; non-secret
// fields (branch/location ids, URLs) stay plaintext. Decryption happens only
// server-side, for the authenticated owner or the integration client.
//
// Backward compatible: legacy plaintext secret values (not yet re-saved) are
// left untouched on read and get encrypted on the next write.

import { decryptSecret, encryptSecret, isEncrypted } from "./secretbox";
import { posSecretKeys } from "./pos";

/** Encrypt secret fields in `cfg` for storage. Idempotent (already-encrypted
 *  values are left as-is). Returns a new object. */
export async function encryptPosConfig(
  posSystem: string | undefined | null,
  cfg: Record<string, string> | undefined | null,
): Promise<Record<string, string>> {
  const out: Record<string, string> = { ...(cfg ?? {}) };
  const secret = new Set(posSecretKeys(posSystem));
  for (const k of Object.keys(out)) {
    if (secret.has(k) && out[k] && !isEncrypted(out[k])) {
      out[k] = await encryptSecret(out[k]);
    }
  }
  return out;
}

/** Decrypt secret fields in `cfg` after reading from storage. Legacy plaintext
 *  values pass through unchanged. Returns a new object. */
export async function decryptPosConfig(
  posSystem: string | undefined | null,
  cfg: Record<string, string> | undefined | null,
): Promise<Record<string, string>> {
  const out: Record<string, string> = { ...(cfg ?? {}) };
  const secret = new Set(posSecretKeys(posSystem));
  for (const k of Object.keys(out)) {
    if (secret.has(k) && isEncrypted(out[k])) {
      const d = await decryptSecret(out[k]);
      // A null decrypt means the ciphertext no longer authenticates under the
      // current key (e.g. POS_ENC_KEY / SESSION_SECRET was rotated). Do NOT
      // coerce to "" — sanitizePosConfig drops empty values and the next
      // settings save would then overwrite the intact ciphertext, permanently
      // destroying a recoverable credential. Keep the original ciphertext so
      // it survives round-trips (encryptPosConfig leaves already-encrypted
      // values as-is) and decrypts again once the correct key is restored.
      if (d === null) {
        console.warn(
          `pos-secrets: could not decrypt "${k}" — encryption key changed? Preserving ciphertext.`,
        );
        continue;
      }
      out[k] = d;
    }
  }
  return out;
}

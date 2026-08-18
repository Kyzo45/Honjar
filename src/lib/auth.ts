import crypto from "crypto";

// Format: scrypt$<salt-hex>$<hash-hex>
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

// Memverifikasi password terhadap hash berformat scrypt$<salt>$<hash>.
// Mengembalikan false (bukan error) untuk hash berformat tak dikenal, supaya
// pemanggil bisa memberi pesan "password salah" yang aman alih-alih membocorkan detail.
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [scheme, salt, hashHex] = storedHash.split("$");
    if (scheme !== "scrypt" || !salt || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = crypto.scryptSync(password, salt, expected.length);
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

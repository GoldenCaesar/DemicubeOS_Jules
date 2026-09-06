// DemicubeOS Cryptographic Hashing & Key Vault Utility
// Supports SHA-256 calculation, .sh vault generation, and .key unhashing

export function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = "length";
  let i, j;
  let result = "";

  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let compositeHash = ascii + "\x80";
  while (compositeHash[lengthProperty] % 64 - 56) compositeHash += "\x00";
  for (i = 0; i < compositeHash[lengthProperty]; i++) {
    j = compositeHash.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength | 0);

  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
        );
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0, a, hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (8 * b)) & 255;
      result += (byte < 16 ? "0" : "") + byte.toString(16);
    }
  }
  return result;
}

export function generateHashedKeyContent(username, ip, password) {
  const hashHex = sha256(password);
  const salt = "s8" + Math.abs(hashHex.split("").reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0) % 900000 + 100000);
  const keyContent = `[ssh_key]\nusername=${username}\nip=${ip}\npassword=${password}\n`;
  const payloadBase64 = typeof btoa === "function" ? btoa(keyContent) : Buffer.from(keyContent).toString("base64");

  return [
    `# DemicubeOS Encrypted Key Archive [SHA-256 Crypt-Vault v2.4]`,
    `# WARNING: Encrypted system credential archive. Unauthorized access is monitored.`,
    `# TARGET_IDENTITY: ${username}@${ip}`,
    `# ALGORITHM: SHA256-PBKDF2-CRYPT`,
    `# DIGEST: ${hashHex}`,
    `# SALT: ${salt}`,
    `# VAULT_PAYLOAD: ${payloadBase64}`,
    `$6$rounds=65536$${salt}$${hashHex}`,
    `::BEGIN ENCRYPTED HASH CONTAINER::`,
    `\\x00\\x1f\\x8b\\x08\\x00\\x00\\x00\\x00\\x00\\x03\\xed\\xbd\\x07\`\\x1cI\\x96%&/m\\xca{\\x7f}\\xbfW\\x1c\\x1b^$y\\xff\\xbe\\x04`,
    `U2FsdGVkX1+${hashHex.slice(0, 32)}+${payloadBase64.slice(0, 24)}/qW8==`,
    `::END ENCRYPTED HASH CONTAINER::`,
    `\\x7fELF\\x02\\x01\\x01\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00`
  ].join("\n");
}

export function parseHashedKeyContent(content) {
  if (!content) return null;
  const str = String(content);

  const payloadMatch = str.match(/#\s*VAULT_PAYLOAD:\s*([A-Za-z0-9+/=]+)/);
  if (payloadMatch) {
    try {
      const decoded = typeof atob === "function" ? atob(payloadMatch[1]) : Buffer.from(payloadMatch[1], "base64").toString("utf-8");
      const userMatch = decoded.match(/username=([^\r\n]+)/);
      const ipMatch = decoded.match(/ip=([^\r\n]+)/);
      const passMatch = decoded.match(/password=([^\r\n]+)/);
      if (userMatch && ipMatch && passMatch) {
        const username = userMatch[1].trim();
        const ip = ipMatch[1].trim();
        const password = passMatch[1].trim();
        return {
          username,
          ip,
          password,
          hash: sha256(password),
          keyContent: decoded
        };
      }
    } catch {
      // ignore
    }
  }

  const hashMatch = str.match(/#\s*DIGEST:\s*([a-f0-9]{64})/i) || str.match(/\$6\$rounds=\d+\$[a-zA-Z0-9]+\$([a-f0-9]{64})/i);
  const targetMatch = str.match(/#\s*TARGET_IDENTITY:\s*([^@\r\n]+)@([^\r\n]+)/);
  if (targetMatch) {
    return {
      username: targetMatch[1].trim(),
      ip: targetMatch[2].trim(),
      password: null,
      hash: hashMatch ? hashMatch[1].toLowerCase() : null,
      keyContent: null
    };
  }

  return null;
}

export const DEFAULT_WORDLIST = [
  "# DemicubeOS Penetration Testing Wordlist v2.1",
  "# Generated for CaesarRip offline dictionary auditing",
  "password",
  "123456",
  "admin",
  "12345678",
  "root",
  "qwerty",
  "12345",
  "dragon",
  "pussy",
  "baseball",
  "football",
  "letmein",
  "monkey",
  "shadow",
  "master",
  "666666",
  "killer",
  "trustno1",
  "iloveyou",
  "sunshine",
  "princess",
  "welcome",
  "charlie",
  "donald",
  "starwars",
  "superman",
  "michael",
  "system",
  "secret",
  "network",
  "gateway",
  "cisco",
  "router",
  "demicube",
  "kali",
  "steve",
  "test_user",
  "pass123",
  "password123",
  "admin123",
  "toor",
  "3tHr90",
  "k8L3m9",
  "p4Q2w8",
  "7nB5x1",
  "d2K8s4",
  "9vL3r6",
  "4mX7z2",
  "winter2024",
  "spring2024",
  "summer2024",
  "autumn2024",
  "security",
  "falcon",
  "hunter2"
].join("\n");


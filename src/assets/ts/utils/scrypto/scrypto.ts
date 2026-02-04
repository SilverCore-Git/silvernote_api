import crypto from 'crypto';


const rawKey = process.env.DB_ENCRYPTION_KEY;

if (!rawKey || rawKey.length !== 64) {
    throw new Error("La clé DB_ENCRYPTION_KEY doit faire 64 caractères hexadécimaux (32 octets).");
}

const MASTER_KEY = Buffer.from(rawKey, 'hex');
const ALGORITHM = 'aes-256-gcm';


function getUserKey(userId: string): Buffer {
    
    return crypto.hkdfSync(
        'sha256',
        MASTER_KEY,
        Buffer.alloc(0),          // Salt (optionnel, vide ici)
        `user-key-${userId}`,     // Info : contexte unique
        32                        // Longueur de clé désirée
    ) as Buffer;
    
}

function getUserFingerprint(userId: string): string {
    const userKey = getUserKey(userId);
    return crypto.createHash('sha256')
        .update(Buffer.from(userKey))
        .digest('hex')
        .toUpperCase()
        .match(/.{1,4}/g)!
        .slice(0, 8)
        .join('-'); 
}


function encrypt(text: string, userId: string)
{

    const userKey = getUserKey(userId);

    // generate random iv and cipher
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, userKey,  iv);

    // encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // return iv, authTag and encrypted text concatenated
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;

}

function decrypt(data: string, userId: string)
{

    const userKey = getUserKey(userId);

    // split the data into its components
    const [ivHex, authTagHex, encryptedText] = data.split(':');
    const decipher = crypto.createDecipheriv(
        ALGORITHM, 
        userKey, 
        Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    // decrypt the text
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;

}

export {
    encrypt,
    decrypt,
    getUserFingerprint
};
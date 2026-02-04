import crypto from 'crypto';


const rawKey = process.env.DB_ENCRYPTION_KEY;

if (!rawKey || rawKey.length !== 64) {
    throw new Error("La clé DB_ENCRYPTION_KEY doit faire 64 caractères hexadécimaux (32 octets).");
}

const ENCRYPTION_KEY = Buffer.from(rawKey, 'hex');
const ALGORITHM = 'aes-256-gcm';


function encrypt(text: string)
{

    // generate random iv and cipher
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

    // encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // return iv, authTag and encrypted text concatenated
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;

}

function decrypt(data: string)
{

    // split the data into its components
    const [ivHex, authTagHex, encryptedText] = data.split(':');
    const decipher = crypto.createDecipheriv(
        ALGORITHM, 
        Buffer.from(ENCRYPTION_KEY), 
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
    decrypt };
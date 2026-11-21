"""Reempaqueta NutriPlan_Pro.apk con un index.html nuevo, alinea y firma con APK Signature Scheme v2."""
import zipfile, struct, hashlib, io, sys, datetime, os, zlib
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding

SRC, NEW_INDEX, OUT, KEYDIR = sys.argv[1:5]

# ---------- 1. Reconstruir el ZIP alineado ----------
def build_zip():
    zin = zipfile.ZipFile(SRC)
    entries = []
    for info in zin.infolist():
        if info.filename.startswith('META-INF/'):
            continue
        data = open(NEW_INDEX, 'rb').read() if info.filename == 'assets/index.html' else zin.read(info.filename)
        entries.append((info.filename, data, info.compress_type))
    out = io.BytesIO(); cd = io.BytesIO(); count = 0
    dos_time, dos_date = 0, (1980 - 1980) << 9 | 1 << 5 | 1
    for name, data, ctype in entries:
        nb = name.encode('utf-8'); crc = zlib.crc32(data) & 0xffffffff
        if ctype == zipfile.ZIP_DEFLATED:
            c = zlib.compressobj(9, zlib.DEFLATED, -15); comp = c.compress(data) + c.flush(); method = 8
        else:
            comp = data; method = 0
        offset = out.tell()
        extra = b''
        if method == 0:  # alinear datos sin comprimir a 4 bytes (resources.arsc a 4 es obligatorio)
            align = 4
            hdr_end = offset + 30 + len(nb)
            pad = (-hdr_end) % align
            extra = b'\x00' * pad
        out.write(struct.pack('<IHHHHHIIIHH', 0x04034b50, 20, 0x0800, method, dos_time, dos_date, crc, len(comp), len(data), len(nb), len(extra)))
        out.write(nb); out.write(extra); out.write(comp)
        cd.write(struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50, 20, 20, 0x0800, method, dos_time, dos_date, crc, len(comp), len(data), len(nb), 0, 0, 0, 0, 0, offset))
        cd.write(nb); count += 1
    cd_bytes = cd.getvalue(); cd_off = out.tell()
    eocd = struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, count, count, len(cd_bytes), cd_off, 0)
    return out.getvalue(), cd_bytes, eocd

entries_bytes, cd_bytes, eocd = build_zip()

# ---------- 2. Clave y certificado ----------
os.makedirs(KEYDIR, exist_ok=True)
kp = os.path.join(KEYDIR, 'nutriplan-key.pem'); cp = os.path.join(KEYDIR, 'nutriplan-cert.pem')
if os.path.exists(kp):
    key = serialization.load_pem_private_key(open(kp, 'rb').read(), None); cert = x509.load_pem_x509_certificate(open(cp, 'rb').read())
else:
    key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'NutriPlan CYC'), x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'CYC-FITNESLAB'), x509.NameAttribute(NameOID.COUNTRY_NAME, 'ES')])
    now = datetime.datetime(2026, 11, 21)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(now).not_valid_after(now + datetime.timedelta(days=365 * 30)).sign(key, hashes.SHA256()))
    open(kp, 'wb').write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    open(cp, 'wb').write(cert.public_bytes(serialization.Encoding.PEM))
cert_der = cert.public_bytes(serialization.Encoding.DER)
pub_der = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)

# ---------- 3. Digest v2 por bloques de 1 MB ----------
def chunk_digest(sections):
    digests = []
    for sec in sections:
        for i in range(0, len(sec), 1048576):
            ch = sec[i:i + 1048576]
            digests.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(ch)) + ch).digest())
    return hashlib.sha256(b'\x5a' + struct.pack('<I', len(digests)) + b''.join(digests)).digest()

def lp(b): return struct.pack('<I', len(b)) + b
ALG = 0x0103  # RSASSA-PKCS1-v1_5 + SHA2-256
# en el digest, el EOCD apunta al inicio del bloque de firma = offset original del directorio central
content_digest = chunk_digest([entries_bytes, cd_bytes, eocd])
digests = lp(lp(struct.pack('<I', ALG) + lp(content_digest)))
certs = lp(lp(cert_der))
signed_data = digests + certs + lp(b'')
signature = key.sign(signed_data, padding.PKCS1v15(), hashes.SHA256())
signer = lp(signed_data) + lp(lp(struct.pack('<I', ALG) + lp(signature))) + lp(pub_der)
v2_value = lp(lp(signer))
pair = struct.pack('<Q', 4 + len(v2_value)) + struct.pack('<I', 0x7109871a) + v2_value
block_size = len(pair) + 8 + 16
block = struct.pack('<Q', block_size) + pair + struct.pack('<Q', block_size) + b'APK Sig Block 42'

new_cd_off = len(entries_bytes) + len(block)
eocd_final = eocd[:16] + struct.pack('<I', new_cd_off) + eocd[20:]
apk = entries_bytes + block + cd_bytes + eocd_final
open(OUT, 'wb').write(apk)
print('APK', OUT, len(apk), 'bytes · certificado SHA-256', hashlib.sha256(cert_der).hexdigest())

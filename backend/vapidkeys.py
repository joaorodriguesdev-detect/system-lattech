"""
Script pra gerar o par de chaves VAPID, necessário pro Web Push funcionar.
Rode isso UMA VEZ na sua VPS (dentro do container do backend ou com as
mesmas libs instaladas) e guarde as chaves geradas no seu .env.

Como rodar:
    pip install pywebpush --break-system-packages
    python3 generate_vapid_keys.py
"""
import base64
from py_vapid import Vapid


def generate():
    vapid = Vapid()
    vapid.generate_keys()

    # Chave pública, em formato urlsafe base64 (é a que vai pro FRONTEND)
    public_key_raw = vapid.public_key.public_bytes(
        encoding=__import__("cryptography.hazmat.primitives.serialization", fromlist=["Encoding"]).Encoding.X962,
        format=__import__("cryptography.hazmat.primitives.serialization", fromlist=["PublicFormat"]).PublicFormat.UncompressedPoint,
    )
    public_key_b64 = base64.urlsafe_b64encode(public_key_raw).decode("utf-8").rstrip("=")

    # Chave privada, em PEM (fica só no BACKEND, nunca exponha)
    private_key_pem = vapid.private_pem().decode("utf-8")

    print("=" * 70)
    print("VAPID_PUBLIC_KEY (vai no frontend, pode ser pública):")
    print(public_key_b64)
    print("=" * 70)
    print("VAPID_PRIVATE_KEY_PEM (fica só no backend, NUNCA compartilhe):")
    print(private_key_pem)
    print("=" * 70)
    print("Copie os dois valores acima pro seu backend/.env, assim:")
    print()
    print(f'VAPID_PUBLIC_KEY="{public_key_b64}"')
    print('VAPID_PRIVATE_KEY_PEM="' + private_key_pem.replace(chr(10), "\\n") + '"')
    print('VAPID_ADMIN_EMAIL="mailto:seuemail@lattech.com.br"')


if __name__ == "__main__":
    generate()
import os
import httpx

# Inicializa as variáveis de ambiente
URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")

if not URL or not KEY:
    print("⚠️ Supabase credentials not found in environment variables.")

def upload_image(file_bytes: bytes, file_path: str, content_type: str) -> str:
    """
    Sobe a imagem para o Supabase via REST API (Bypass de dependências) 
    e retorna a URL pública gerada.
    """
    # Endpoint oficial de upload do Supabase Storage
    # Formato: {SUPABASE_URL}/storage/v1/object/{NOME_DO_BUCKET}/{CAMINHO_DO_ARQUIVO}
    upload_url = f"{URL}/storage/v1/object/portfolio/{file_path}"
    
    headers = {
        "Authorization": f"Bearer {KEY}",
        "apikey": KEY,
        "Content-Type": content_type
    }
    
    try:
        # Faz a requisição POST direta (o timeout de 30s evita travar se a imagem for grande)
        response = httpx.post(upload_url, headers=headers, content=file_bytes, timeout=30.0)
        
        # 200 (OK) ou 201 (Created) significam sucesso
        if response.status_code in (200, 201):
            # Monta a URL pública absoluta
            public_url = f"{URL}/storage/v1/object/public/portfolio/{file_path}"
            return public_url
        else:
            print(f"[STORAGE_SERVICE] Erro na API do Supabase: {response.status_code} - {response.text}")
            raise Exception("Falha no upload")
            
    except Exception as e:
        print(f"[STORAGE_SERVICE] Erro na requisição HTTP: {e}")
        raise

def delete_image(file_path: str) -> bool:
    """
    Remove fisicamente a imagem do bucket do Supabase via API REST.
    """
    delete_url = f"{URL}/storage/v1/object/portfolio/{file_path}"
    
    headers = {
        "Authorization": f"Bearer {KEY}",
        "apikey": KEY
    }
    
    try:
        response = httpx.delete(delete_url, headers=headers, timeout=15.0)
        if response.status_code in (200, 204):
            print(f"[STORAGE_SERVICE] Imagem deletada do Supabase: {file_path}")
            return True
        else:
            print(f"[STORAGE_SERVICE] Erro ao deletar no Supabase: {response.text}")
            return False
    except Exception as e:
        print(f"[STORAGE_SERVICE] Erro na requisição HTTP de deleção: {e}")
        return False

def upload_logo(file_bytes: bytes, file_path: str, content_type: str) -> str:
    """
    Sobe a logo da barbearia para o bucket 'logos' via REST API.
    """
    upload_url = f"{URL}/storage/v1/object/logos/{file_path}"
    
    headers = {
        "Authorization": f"Bearer {KEY}",
        "apikey": KEY,
        "Content-Type": content_type
    }
    
    try:
        response = httpx.post(upload_url, headers=headers, content=file_bytes, timeout=30.0)
        
        if response.status_code in (200, 201):
            public_url = f"{URL}/storage/v1/object/public/logos/{file_path}"
            return public_url
        else:
            print(f"[STORAGE_SERVICE] Erro no Supabase (Logo): {response.text}")
            raise Exception("Falha no upload da logo")
            
    except Exception as e:
        print(f"[STORAGE_SERVICE] Erro na requisição HTTP: {e}")
        raise

def upload_product(file_bytes: bytes, file_path: str, content_type: str) -> str:
    """ Sobe a imagem do produto para o bucket 'products' """
    upload_url = f"{URL}/storage/v1/object/products/{file_path}"
    headers = {"Authorization": f"Bearer {KEY}", "apikey": KEY, "Content-Type": content_type}
    
    try:
        response = httpx.post(upload_url, headers=headers, content=file_bytes, timeout=30.0)
        if response.status_code in (200, 201):
            return f"{URL}/storage/v1/object/public/products/{file_path}"
        else:
            raise Exception(f"Falha no upload do produto: {response.text}")
    except Exception as e:
        raise

def delete_product_image(file_path: str) -> bool:
    """ Deleta a imagem do produto do bucket 'products' """
    delete_url = f"{URL}/storage/v1/object/products/{file_path}"
    headers = {"Authorization": f"Bearer {KEY}", "apikey": KEY}
    try:
        response = httpx.delete(delete_url, headers=headers, timeout=15.0)
        return response.status_code in (200, 204)
    except:
        return False


def upload_banner(file_bytes: bytes, file_path: str, content_type: str) -> str:
    """ Sobe a imagem do banner para o bucket 'banners' """
    upload_url = f"{URL}/storage/v1/object/banners/{file_path}"
    headers = {"Authorization": f"Bearer {KEY}", "apikey": KEY, "Content-Type": content_type}
    try:
        response = httpx.post(upload_url, headers=headers, content=file_bytes, timeout=30.0)
        if response.status_code in (200, 201):
            return f"{URL}/storage/v1/object/public/banners/{file_path}"
        else:
            raise Exception(f"Falha no upload do banner: {response.text}")
    except Exception as e:
        print(f"[STORAGE_SERVICE] Erro upload banner: {e}")
        raise


def delete_banner(file_path: str) -> bool:
    """ Deleta a imagem do banner do bucket 'banners' """
    delete_url = f"{URL}/storage/v1/object/banners/{file_path}"
    headers = {"Authorization": f"Bearer {KEY}", "apikey": KEY}
    try:
        response = httpx.delete(delete_url, headers=headers, timeout=15.0)
        return response.status_code in (200, 204)
    except:
        return False
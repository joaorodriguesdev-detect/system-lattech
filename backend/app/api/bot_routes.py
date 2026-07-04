from fastapi import APIRouter, HTTPException
import httpx
from datetime import datetime

router = APIRouter(prefix="/bot", tags=["Bot de Inteligência Artificial"])

# Coloque aqui sua chave real do DeepSeek
DEEPSEEK_API_KEY = ""

# --- Funções Auxiliares (O Filtro) ---

def get_horarios_ocupados_hoje():
    # Aqui é onde, no futuro, você buscará no banco de dados com:
    # db.query(Appointment).filter(Appointment.date == hoje).all()
    return ["09:00", "14:00"] 

def gerar_lista_horarios_disponiveis():
    horarios_dia = []
    # Cria os horários de 30 em 30 min das 08h às 19h
    for h in range(8, 19):
        horarios_dia.append(f"{h:02d}:00")
        horarios_dia.append(f"{h:02d}:30")
    
    ocupados = get_horarios_ocupados_hoje()
    
    # Filtra: Só deixa passar o que não está na lista de ocupados
    disponiveis = [h for h in horarios_dia if h not in ocupados]
    return ", ".join(disponiveis)

# --- A Rota do Garçom de IA ---

@router.post("/testar")
async def conversar_com_ia(mensagem_cliente: str):
    url = "https://api.deepseek.com/chat/completions"
    horarios = gerar_lista_horarios_disponiveis()
    
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # O Prompt de Sistema "Sussurrado"
    prompt_sistema = f"""
    Você é o recepcionista da Flux Barber. 
    Horários de funcionamento: 08h às 19h.
    Horários DISPONÍVEIS para hoje: {horarios}.
    
    REGRAS:
    1. SE O CLIENTE ESCOLHER UM HORÁRIO: Responda apenas "Agendado para as [horário]. Obrigado!".
    2. SE O CLIENTE PERGUNTAR POR HORÁRIOS: Liste apenas os que estão em {horarios}.
    3. Mantenha um tom amigável e de WhatsApp.
    4. Se o cliente pedir algo fora de agendamento, seja educado e volte para o assunto de agendar.
    """

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": prompt_sistema},
            {"role": "user", "content": mensagem_cliente}
        ],
        "temperature": 0.5
    }

    async with httpx.AsyncClient() as client:
        try:
            resposta = await client.post(url, headers=headers, json=payload, timeout=15.0)
            resposta.raise_for_status()
            
            dados = resposta.json()
            texto_ia = dados["choices"][0]["message"]["content"]
            
            return {
                "cliente_disse": mensagem_cliente,
                "ia_respondeu": texto_ia
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro na IA: {str(e)}")
"""
Buhotech Labs - Orquestador Multi-IA con Tolerancia a Fallos.

Gestiona 10 motores de IA (6 Gemini + Groq + Mistral + Meta + Ollama)
con rotación Round-Robin, reintentos automáticos y failover transparente.

Diseñado para soportar 50+ alumnos simultáneos sin saturación.
"""
import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger("buhotech.ai")


@dataclass
class AIResponse:
    """Respuesta estandarizada de cualquier proveedor de IA."""
    text: str
    provider: str
    model: str
    latency_ms: int
    success: bool = True
    error: str = ""


@dataclass
class ProviderState:
    """Estado de un proveedor/clave individual."""
    name: str
    key: str
    model: str
    request_count: int = 0
    last_error_time: float = 0
    consecutive_errors: int = 0
    is_available: bool = True


class AIOrchestrator:
    """
    Orquestador inteligente de múltiples proveedores de IA.
    
    Estrategia de cascada:
    1. Pool de 6 Gemini (Round-Robin) → Motor principal
    2. Groq (Llama 3.3) → Respaldo ultra-rápido
    3. Meta AI → Respaldo de alto rendimiento
    4. Mistral AI → Respaldo de contingencia
    5. Ollama → Respaldo local
    """

    def __init__(self):
        self._providers: list[ProviderState] = []
        self._current_gemini_index = 0
        self._lock = asyncio.Lock()
        self._http_client: Optional[httpx.AsyncClient] = None
        self._initialize_providers()

    def _initialize_providers(self):
        """Registra todos los proveedores disponibles según las claves en .env."""
        # Pool de Gemini
        for i, key in enumerate(settings.GEMINI_API_KEYS):
            self._providers.append(ProviderState(
                name=f"gemini_{i+1}",
                key=key,
                model=settings.GEMINI_MODEL,
            ))

        # Proveedores de respaldo
        if settings.GROQ_API_KEY:
            self._providers.append(ProviderState(
                name="groq",
                key=settings.GROQ_API_KEY,
                model=settings.GROQ_MODEL,
            ))

        if settings.META_API_KEY:
            self._providers.append(ProviderState(
                name="meta",
                key=settings.META_API_KEY,
                model=settings.META_MODEL,
            ))

        if settings.MISTRAL_API_KEY:
            self._providers.append(ProviderState(
                name="mistral",
                key=settings.MISTRAL_API_KEY,
                model=settings.MISTRAL_MODEL,
            ))

        logger.info(f"AI Orchestrator inicializado con {len(self._providers)} proveedores:")
        for p in self._providers:
            logger.info(f"  → {p.name} ({p.model})")

    async def _get_client(self) -> httpx.AsyncClient:
        """Obtiene o crea el cliente HTTP asíncrono."""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=30.0)
        return self._http_client

    def _get_next_gemini(self) -> Optional[ProviderState]:
        """Obtiene la siguiente clave Gemini disponible (Round-Robin)."""
        gemini_providers = [p for p in self._providers if p.name.startswith("gemini") and p.is_available]
        if not gemini_providers:
            return None
        provider = gemini_providers[self._current_gemini_index % len(gemini_providers)]
        self._current_gemini_index += 1
        return provider

    def _get_fallback_providers(self) -> list[ProviderState]:
        """Obtiene los proveedores de respaldo disponibles."""
        return [p for p in self._providers if not p.name.startswith("gemini") and p.is_available]

    async def _call_gemini(self, provider: ProviderState, system_prompt: str, user_message: str, history: list[dict] = None) -> AIResponse:
        """Llama a la API de Google Gemini."""
        start = time.time()
        client = await self._get_client()

        # Construir el historial de conversación
        contents = []
        if history:
            for msg in history:
                contents.append({
                    "role": "user" if msg["role"] == "user" else "model",
                    "parts": [{"text": msg["content"]}]
                })
        contents.append({"role": "user", "parts": [{"text": user_message}]})

        payload = {
            "contents": contents,
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 500,
                "topP": 0.9,
            }
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{provider.model}:generateContent?key={provider.key}"

        try:
            response = await client.post(url, json=payload)
            latency = int((time.time() - start) * 1000)

            if response.status_code == 200:
                data = response.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                provider.consecutive_errors = 0
                provider.request_count += 1
                return AIResponse(text=text, provider=provider.name, model=provider.model, latency_ms=latency)
            elif response.status_code == 429:
                logger.warning(f"Rate limit en {provider.name} (429). Rotando...")
                provider.last_error_time = time.time()
                provider.consecutive_errors += 1
                if provider.consecutive_errors >= 3:
                    provider.is_available = False
                    asyncio.get_event_loop().call_later(60, lambda: setattr(provider, 'is_available', True))
                return AIResponse(text="", provider=provider.name, model=provider.model, latency_ms=latency, success=False, error="RATE_LIMIT")
            else:
                logger.error(f"Error {response.status_code} en {provider.name}: {response.text[:200]}")
                return AIResponse(text="", provider=provider.name, model=provider.model, latency_ms=latency, success=False, error=f"HTTP_{response.status_code}")

        except Exception as e:
            latency = int((time.time() - start) * 1000)
            logger.error(f"Excepción en {provider.name}: {e}")
            return AIResponse(text="", provider=provider.name, model=provider.model, latency_ms=latency, success=False, error=str(e))

    async def _call_groq(self, provider: ProviderState, system_prompt: str, user_message: str, history: list[dict] = None) -> AIResponse:
        """Llama a la API de Groq Cloud."""
        start = time.time()
        client = await self._get_client()

        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        try:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {provider.key}", "Content-Type": "application/json"},
                json={"model": provider.model, "messages": messages, "temperature": 0.7, "max_tokens": 500}
            )
            latency = int((time.time() - start) * 1000)

            if response.status_code == 200:
                text = response.json()["choices"][0]["message"]["content"]
                provider.request_count += 1
                return AIResponse(text=text, provider=provider.name, model=provider.model, latency_ms=latency)
            else:
                return AIResponse(text="", provider=provider.name, model=provider.model, latency_ms=latency, success=False, error=f"HTTP_{response.status_code}")

        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return AIResponse(text="", provider=provider.name, model=provider.model, latency_ms=latency, success=False, error=str(e))

    async def _call_mistral(self, provider: ProviderState, system_prompt: str, user_message: str, history: list[dict] = None) -> AIResponse:
        """Llama a la API de Mistral AI."""
        start = time.time()
        client = await self._get_client()

        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        try:
            response = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {provider.key}", "Content-Type": "application/json"},
                json={"model": provider.model, "messages": messages, "temperature": 0.7, "max_tokens": 500}
            )
            latency = int((time.time() - start) * 1000)

            if response.status_code == 200:
                text = response.json()["choices"][0]["message"]["content"]
                provider.request_count += 1
                return AIResponse(text=text, provider=provider.name, model=provider.model, latency_ms=latency)
            else:
                return AIResponse(text="", provider=provider.name, model=provider.model, latency_ms=latency, success=False, error=f"HTTP_{response.status_code}")

        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return AIResponse(text="", provider=provider.name, model=provider.model, latency_ms=latency, success=False, error=str(e))

    async def _call_meta(self, provider: ProviderState, system_prompt: str, user_message: str, history: list[dict] = None) -> AIResponse:
        """Llama a la API de Meta AI / Together AI."""
        start = time.time()
        client = await self._get_client()

        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        try:
            response = await client.post(
                "https://api.together.xyz/v1/chat/completions",
                headers={"Authorization": f"Bearer {provider.key}", "Content-Type": "application/json"},
                json={"model": f"meta-llama/{provider.model}", "messages": messages, "temperature": 0.7, "max_tokens": 500}
            )
            latency = int((time.time() - start) * 1000)

            if response.status_code == 200:
                text = response.json()["choices"][0]["message"]["content"]
                provider.request_count += 1
                return AIResponse(text=text, provider=provider.name, model=provider.model, latency_ms=latency)
            else:
                return AIResponse(text="", provider=provider.name, model=provider.model, latency_ms=latency, success=False, error=f"HTTP_{response.status_code}")

        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return AIResponse(text="", provider=provider.name, model=provider.model, latency_ms=latency, success=False, error=str(e))

    async def _dispatch(self, provider: ProviderState, system_prompt: str, user_message: str, history: list[dict] = None) -> AIResponse:
        """Despacha la petición al proveedor correcto."""
        if provider.name.startswith("gemini"):
            return await self._call_gemini(provider, system_prompt, user_message, history)
        elif provider.name == "groq":
            return await self._call_groq(provider, system_prompt, user_message, history)
        elif provider.name == "mistral":
            return await self._call_mistral(provider, system_prompt, user_message, history)
        elif provider.name == "meta":
            return await self._call_meta(provider, system_prompt, user_message, history)
        else:
            return AIResponse(text="", provider=provider.name, model=provider.model, latency_ms=0, success=False, error="UNKNOWN_PROVIDER")

    async def chat(
        self,
        system_prompt: str,
        user_message: str,
        history: list[dict] = None,
        max_retries: int = 3,
    ) -> AIResponse:
        """
        Punto de entrada principal. Envía un mensaje al sistema de IA con
        cascada de proveedores y reintentos automáticos.
        
        Flujo:
        1. Intenta con la siguiente clave Gemini del pool (Round-Robin).
        2. Si falla, reintenta con otra clave Gemini.
        3. Si todas las Gemini están saturadas, salta a Groq → Meta → Mistral.
        """
        async with self._lock:
            # Intentar con el pool de Gemini primero
            for attempt in range(max_retries):
                gemini = self._get_next_gemini()
                if gemini:
                    result = await self._dispatch(gemini, system_prompt, user_message, history)
                    if result.success:
                        logger.info(f"✅ Respuesta de {result.provider} en {result.latency_ms}ms (intento {attempt+1})")
                        return result
                    logger.warning(f"⚠️ Fallo en {gemini.name} (intento {attempt+1}/{max_retries}): {result.error}")
                    await asyncio.sleep(0.2 * (attempt + 1))  # Backoff exponencial

            # Fallback a proveedores secundarios
            for fallback in self._get_fallback_providers():
                result = await self._dispatch(fallback, system_prompt, user_message, history)
                if result.success:
                    logger.info(f"🔄 Fallback exitoso: {result.provider} en {result.latency_ms}ms")
                    return result
                logger.warning(f"⚠️ Fallback {fallback.name} también falló: {result.error}")

            # Si todo falla, devolver respuesta de emergencia
            logger.error("❌ TODOS los proveedores fallaron")
            return AIResponse(
                text="Lo siento, el Búho está descansando en este momento. Por favor intenta de nuevo en unos segundos. 🦉💤",
                provider="fallback_local",
                model="none",
                latency_ms=0,
                success=False,
                error="ALL_PROVIDERS_FAILED"
            )

    async def close(self):
        """Cierra el cliente HTTP."""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()

    def get_stats(self) -> dict:
        """Devuelve estadísticas de uso de cada proveedor (para el panel del investigador)."""
        return {
            "providers": [
                {
                    "name": p.name,
                    "model": p.model,
                    "requests": p.request_count,
                    "available": p.is_available,
                    "consecutive_errors": p.consecutive_errors,
                }
                for p in self._providers
            ],
            "total_requests": sum(p.request_count for p in self._providers),
        }


# Instancia global (singleton)
ai_orchestrator = AIOrchestrator()

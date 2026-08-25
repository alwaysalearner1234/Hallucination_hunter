"""
LLM Client — supports Gemini and OpenAI.
The provider is controlled by LLM_PROVIDER env var.
"""
import json
import re
from typing import Any, Dict, Optional
import structlog
from app.core.config import settings

logger = structlog.get_logger()


class LLMClient:
    """Unified LLM client supporting Gemini and OpenAI."""

    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self._client = None

    def _get_client(self):
        if self._client:
            return self._client

        if self.provider == "gemini":
            if not settings.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY is not configured. Set it in your .env file.")
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._client = genai.GenerativeModel("gemini-1.5-flash")
        elif self.provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY is not configured. Set it in your .env file.")
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            raise ValueError(f"Unknown LLM_PROVIDER: {self.provider}")

        return self._client

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
    ) -> str:
        """Send a chat completion request and return the text response."""
        client = self._get_client()

        try:
            if self.provider == "gemini":
                full_prompt = f"{system_prompt}\n\n{user_prompt}"
                response = client.generate_content(
                    full_prompt,
                    generation_config={
                        "temperature": temperature,
                        "max_output_tokens": max_tokens,
                    },
                )
                return response.text

            elif self.provider == "openai":
                response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return response.choices[0].message.content

        except Exception as e:
            logger.error("llm_error", provider=self.provider, error=str(e))
            raise

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        """Complete and parse JSON from response."""
        raw = await self.complete(system_prompt, user_prompt, temperature)
        return self._parse_json(raw)

    def _parse_json(self, text: str) -> Dict[str, Any]:
        """Extract and parse JSON from LLM response, handling markdown code blocks."""
        # Strip markdown code fences
        clean = re.sub(r"```(?:json)?\s*", "", text).replace("```", "").strip()

        # Try direct parse
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            pass

        # Try extracting JSON object
        match = re.search(r"\{.*\}", clean, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        # Try extracting JSON array
        match = re.search(r"\[.*\]", clean, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        raise ValueError(f"Could not parse JSON from LLM response: {text[:200]}")


# Singleton
llm_client = LLMClient()

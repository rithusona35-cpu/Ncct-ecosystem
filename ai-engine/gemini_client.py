"""
NCCT Ecosystem - Gemini AI Client
Connects to Google Gemini API to generate grounded natural language responses
based on RAG retrieved chunks and backend database context, with full multilingual support.
"""

import os
import re
import sys
import logging
import warnings
from typing import Optional, Dict, Any
from dotenv import load_dotenv

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)
os.environ["ORT_LOG_LEVEL"] = "3"

logger = logging.getLogger("ncct_gemini")

# Locate and load .env from multiple potential directory levels
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
BACKEND_DIR = os.path.abspath(os.path.join(ROOT_DIR, "backend"))

for env_path in [
    os.path.join(ROOT_DIR, ".env"),
    os.path.join(CURRENT_DIR, ".env"),
    os.path.join(BACKEND_DIR, ".env"),
]:
    if os.path.exists(env_path):
        load_dotenv(env_path, override=False)


def _fallback_natural_language_generator(
    user_message: str,
    context: str,
    intent: str,
    language: str
) -> str:
    """
    High-fidelity grounded natural response generator used for demo/test mode,
    adhering strictly to the system instruction and language preference.
    """
    lang = (language or "English").strip().lower()

    if lang in ["tamil", "ta"]:
        if intent == "progress_query":
            match = re.search(r"(\d+(?:\.\d+)?%)", context)
            pct = match.group(1) if match else "0%"
            mod_match = re.search(r"(\d+)\s+of\s+(\d+)\s+modules", context)
            if mod_match:
                comp, tot = mod_match.group(1), mod_match.group(2)
                return f"தங்களின் தற்போதைய வருகைப்பதிவு {pct} ஆகும். நீங்கள் இதுவரை {tot} பாடப்பிரிவுகளில் {comp} தொகுதிகளை வெற்றிகரமாக முடித்துள்ளீர்கள்."
            return f"தங்களின் தற்போதைய வருகைப்பதிவு {pct} ஆகும்."

        elif intent == "learning_question":
            clean_ctx = context.replace("#", "").strip()
            # If about PACS
            if "pacs" in user_message.lower() or "primary agricultural credit" in user_message.lower():
                return (
                    "தொடக்க வேளாண்மை கூட்டுறவுக் கடன் சங்கம் (PACS) என்பது இந்தியாவில் உள்ள கிராமப்புற "
                    "விவசாயிகள் மற்றும் கைவினைஞர்களுக்கு குறுகிய கால பயிர்க்கடன்கள் மற்றும் இடுபொருட்களை "
                    "வழங்கும் மிக முக்கியமான கிராம அளவிலான கூட்டுறவு அமைப்பாகும்."
                )
            # If about cooperative accounting
            if "accounting" in user_message.lower() or "கணக்கியல்" in user_message.lower():
                return (
                    "கூட்டுறவு கணக்கியல் என்பது கூட்டுறவு சங்கங்களுக்கான இரட்டைப் பதிவு முறை கணக்கு பராமரிப்பாகும். "
                    "இதில் நாள் புத்தகம், பேரேடு மற்றும் ஆண்டு தணிக்கை ஆகியவை அடங்கும். மேலும் சட்டப்பூர்வ "
                    "இருப்பு நிதிக்கு நிகர லாபத்தில் குறைந்தது 25% ஒதுக்கீடு செய்யப்படுவது கட்டாயமாகும்."
                )
            # General RAG summary in Tamil
            first_p = clean_ctx.split("\n\n")[0] if clean_ctx else context
            return f"தேசிய கூட்டுறவு பயிற்சி கவுன்சில் (NCCT) வழிகாட்டுதலின்படி: {first_p[:200]}..."

        elif intent == "skill_gap_query":
            return f"தங்களின் திறன் பகுப்பாய்வு முடிவு: {context}"
        elif intent == "career_query":
            return f"தங்களுக்கு கிடைக்கும் வேலைவாய்ப்பு விவரங்கள்: {context}"
        elif intent == "certificate_query":
            return f"தங்களின் சான்றிதழ் விவரங்கள்: {context}"
        elif intent == "training_schedule_query":
            return f"தங்களின் பயிற்சி வகுப்பு அட்டவணை: {context}"
        else:
            return f"வணக்கம்! NCCT கூட்டுறவு பயிற்சி வழிகாட்டியாக தங்களுக்கு உதவ தயாராக உள்ளேன். தங்களின் வருகைப்பதிவு அல்லது பாடங்கள் குறித்து கேட்கலாம்."

    elif lang in ["hindi", "hi"]:
        if intent == "progress_query":
            match = re.search(r"(\d+(?:\.\d+)?%)", context)
            pct = match.group(1) if match else "0%"
            return f"आपकी वर्तमान उपस्थिति {pct} है। आप अपनी प्रशिक्षण प्रगति सफलतापूर्वक जारी रख रहे हैं।"
        elif intent == "learning_question":
            return f"एनसीआरटी और एनसीटीसी सहकारी अध्ययन के अनुसार: {context[:250]}..."

    # English natural phrasing
    if intent == "progress_query":
        pct_match = re.search(r"(\d+(?:\.\d+)?%)", context)
        pct = pct_match.group(1) if pct_match else "0%"
        mod_match = re.search(r"(\d+)\s+of\s+(\d+)\s+modules", context)
        if mod_match:
            comp, tot = mod_match.group(1), mod_match.group(2)
            return (
                f"Your current attendance is {pct}. You have successfully completed "
                f"{comp} of the {tot} modules in your enrolled training curriculum."
            )
        return f"Your current attendance is {pct} across your scheduled training sessions."

    elif intent == "learning_question":
        clean_ctx = re.sub(r"#+\s*", "", context).strip()
        paragraphs = [p.strip() for p in clean_ctx.split("\n\n") if p.strip() and not p.startswith("---")]
        if paragraphs:
            summary = " ".join(paragraphs[:2])
            if len(summary) > 400:
                summary = summary[:400] + "..."
            return f"According to the NCCT training knowledge base, {summary}"
        return f"Based on the NCCT knowledge base: {context[:350]}"

    elif intent == "skill_gap_query":
        return f"Based on your latest competency evaluation, {context}"

    elif intent == "career_query":
        return f"Here are the active career opportunities in the cooperative sector: {context}"

    elif intent == "certificate_query":
        return f"Regarding your digital credentials: {context}"

    elif intent == "training_schedule_query":
        return f"Here is your upcoming NCCT training schedule: {context}"

    return f"Hello! As your NCCT Cooperative Assistant, I'm here to support your learning journey: {context}"


def generate_ncct_response(
    user_message: str,
    context: str,
    intent: str,
    language: str = "English"
) -> str:
    """
    Sends retrieved knowledge base chunks or backend context to Gemini with system prompt
    and returns a concise, grounded natural language answer in the requested language.
    Raises an exception on failure or if FALLBACK_MODE=true / bad key so the backend
    can trigger rule-based offline fallback with is_fallback=True.
    """
    # 1. Check if forced fallback mode is active in environment
    forced_fallback = os.getenv("FALLBACK_MODE", "").strip().lower() in ["true", "1", "yes"]
    if forced_fallback:
        raise RuntimeError("FALLBACK_MODE=true is configured in environment.")

    # 2. Retrieve and validate GEMINI_API_KEY
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    if api_key == "bad_api_key" or "bad_key" in api_key.lower():
        raise ValueError(f"Simulation bad API key provided: '{api_key}'")

    lang = (language or "English").strip()

    # 3. If demo key for testing environment, use internal grounded generator
    if api_key.startswith("AIzaSyDemo"):
        return _fallback_natural_language_generator(
            user_message=user_message,
            context=context,
            intent=intent,
            language=lang
        )

    # 4. For live external key, call Gemini API
    system_instruction = (
        "You are the NCCT Cooperative Training Assistant. Answer using ONLY the provided data/context. "
        "Be concise, accurate, and helpful. If the context does not contain the answer, say so honestly."
    )
    if lang.lower() not in ["english", "en"]:
        system_instruction += (
            f"\nCRITICAL REQUIREMENT: The trainee's preferred language is {lang}. "
            f"You MUST generate your entire response in {lang}."
        )

    if intent == "learning_question":
        prompt_content = (
            f"RETRIEVED KNOWLEDGE BASE CONTEXT:\n{context}\n\n"
            f"USER QUESTION:\n{user_message}\n\n"
            f"Provide a clear, natural response grounded strictly in the context above."
        )
    else:
        prompt_content = (
            f"BACKEND TRAINEE DATA:\n{context}\n\n"
            f"USER QUERY:\n{user_message}\n\n"
            f"Provide a natural, conversational response using the data above."
        )

    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt_content,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
                max_output_tokens=600
            )
        )
        if response and response.text:
            return response.text.strip()
    except Exception as e_new:
        logger.debug(f"google.genai call attempt: {e_new}")
        try:
            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=api_key)
            model = legacy_genai.GenerativeModel("gemini-1.5-flash")
            full_prompt = f"{system_instruction}\n\n{prompt_content}"
            res = model.generate_content(full_prompt)
            if res and res.text:
                return res.text.strip()
        except Exception as e_leg:
            raise RuntimeError(f"Gemini API request failed: {e_new} | {e_leg}") from e_new

    raise RuntimeError("Empty response received from Gemini API.")

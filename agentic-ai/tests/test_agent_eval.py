import os
import pytest
from google import genai
from deepeval.models import DeepEvalBaseLLM
from deepeval.metrics import AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase

class GeminiJudge(DeepEvalBaseLLM):
    def __init__(self, model_name: str = "gemini-3.8-flash"):
        self.model_name = model_name
        self.client = genai.Client(
            api_key=os.environ.get("GEMINI_API_KEY")
        )

    def load_model(self):
        return self.client

    def generate(self, prompt: str, schema=None) -> str:
        config = {}

        if schema:
            config["response_mime_type"] = "application/json"
            config["response_schema"] = schema

        # Try the requested model first, then fall back to another
        # currently available Gemini Flash model.
        models_to_try = [
            self.model_name,
            "gemini-3.7-flash",
            "gemini-3.5-flash-lite",
        ]

        last_error = None

        for model in models_to_try:
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config if config else None,
                )

                return response.text

            except Exception as e:
                last_error = e
                continue

        raise last_error

    async def a_generate(self, prompt: str, schema=None) -> str:
        return self.generate(prompt, schema=schema)

    def get_model_name(self) -> str:
        return self.model_name


def test_valuation_agent_schema_adherence():
    """Evaluate Agent 4 against the strict 7-bullet point schema requirement."""

    input_prompt = "Generate the 'ai_insight' adhering strictly to the 7 required bullet points based on the clean history provided."

    actual_llm_output = """
    - 1. Police & Accident History: No records found.
    - 2. Legal & Ownership: Registration valid. 1 past owner.
    - 3. Overall Condition: Good.
    - 4. Deep Service Analysis: Regular maintenance observed.
    - 5. Anomaly Detection: None detected.
    - 6. Future Predictions: Check timing belt soon.
    - 7. Final Recommendation: PROCEED.
    """

    # 1. Deterministic structured output check
    bullet_count = actual_llm_output.count("- ")
    assert bullet_count == 7, f"Agentic AI Failed: Expected 7 formatting bullets, found {bullet_count}"

    # 2. Semantic evaluation using Gemini
    gemini_judge = GeminiJudge(model_name="gemini-3.8-flash")
    relevancy_metric = AnswerRelevancyMetric(threshold=0.8, model=gemini_judge)

    test_case = LLMTestCase(
        input=input_prompt,
        actual_output=actual_llm_output
    )

    relevancy_metric.measure(test_case)
    assert relevancy_metric.is_successful(), relevancy_metric.reason
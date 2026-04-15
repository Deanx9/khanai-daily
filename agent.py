"""
Research Agent — powered by DeepSeek via OpenRouter (free tier)
Follows the research-report workflow defined in workflows/research-report.md
"""

import os
import anthropic
from datetime import datetime

# ── Client setup ──────────────────────────────────────────────────────────────
# Uses OpenRouter free tier — no payment required
# Reads OPENROUTER_API_KEY from environment
client = anthropic.Anthropic(
    api_key=os.environ.get("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api",
)

MODEL = "deepseek/deepseek-chat"  # free model on OpenRouter
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")

SYSTEM_PROMPT = """
You are a structured research assistant following a strict workflow.

## Your Rules
- Ask clarifying questions before starting any research
- Confirm the plan with the user before executing
- Structure every report with these sections:
  1. Title
  2. Objective
  3. Executive Summary
  4. Key Findings
  5. Analysis
  6. Risks or Limitations
  7. Key Takeaways
  8. Recommended Next Steps
  9. Sources
- Use bullet points more than long paragraphs
- Be clear and practical — avoid fluff
- If a topic is too broad, ask the user to narrow it
- Cite sources when doing research
- At the end of a completed report, output a line:
  SAVE_REPORT: <suggested_filename.md>
  followed by the full report content between ---START--- and ---END--- markers
""".strip()


def chat(messages: list) -> str:
    """Send message history to Claude and return the assistant reply."""
    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=messages,
    )
    return response.content[0].text


def save_report(filename: str, content: str):
    """Save a report to the output folder."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{filename}"
    path = os.path.join(OUTPUT_DIR, safe_name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"\n[Saved] → output/{safe_name}")
    return path


def extract_and_save(reply: str):
    """Check if Claude wants to save a report, and save it."""
    if "SAVE_REPORT:" not in reply:
        return
    try:
        lines = reply.splitlines()
        save_line = next(l for l in lines if l.startswith("SAVE_REPORT:"))
        filename = save_line.replace("SAVE_REPORT:", "").strip()
        start = reply.index("---START---") + len("---START---")
        end = reply.index("---END---")
        report_content = reply[start:end].strip()
        save_report(filename, report_content)
    except (ValueError, StopIteration):
        pass  # markers not found — skip saving


def main():
    print("=" * 60)
    print("  Research Agent  |  Powered by DeepSeek (Free via OpenRouter)")
    print("  Type 'quit' to exit")
    print("=" * 60)
    print()

    messages = []

    # Start with the workflow trigger
    print("What would you like to research today?")
    print()

    while True:
        user_input = input("You: ").strip()
        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            print("Goodbye!")
            break

        messages.append({"role": "user", "content": user_input})

        print("\nAssistant: ", end="", flush=True)
        reply = chat(messages)
        print(reply)
        print()

        messages.append({"role": "assistant", "content": reply})

        # Auto-save if Claude signals a completed report
        extract_and_save(reply)


if __name__ == "__main__":
    main()

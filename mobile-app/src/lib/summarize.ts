/** HuggingFace summarization (web `frontend/src/lib/summarize.ts` bilan bir xil). */
export async function summarizeChat(messagesText: string): Promise<string | null> {
  try {
    const token = process.env.EXPO_PUBLIC_HF_TOKEN;
    const url = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        inputs: messagesText.slice(0, 4000),
        parameters: {
          max_length: 150,
          min_length: 30,
          do_sample: false,
        },
      }),
      headers,
    });

    if (!response.ok) {
      if (response.status === 503) return "XIZMAT_BAND";
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0 && data[0].summary_text) {
      return String(data[0].summary_text);
    }
    return null;
  } catch (error) {
    console.error("Error summarizing chat:", error);
    return null;
  }
}

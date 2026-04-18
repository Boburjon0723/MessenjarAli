export const summarizeChat = async (messagesText: string): Promise<string | null> => {
    try {
        const token = process.env.NEXT_PUBLIC_HF_TOKEN; // Optional: user can add their token in .env.local

        // Using a popular free summarization model
        const url = 'https://api-inference.huggingface.co/models/facebook/bart-large-cnn';

        const headers: Record<string, string> = {
            "Content-Type": "application/json"
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                inputs: messagesText,
                parameters: {
                    max_length: 150,
                    min_length: 30,
                    do_sample: false
                }
            }),
            headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('HuggingFace API Error:', response.statusText, errorText);
            // If the model is currently loading, wait or return specific error
            if (response.status === 503) {
                return "XIZMAT_BAND"; // Model is loading, please try again
            }
            return null;
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0 && data[0].summary_text) {
            return data[0].summary_text;
        }
        return null;
    } catch (error) {
        console.error('Error summarizing chat:', error);
        return null;
    }
};



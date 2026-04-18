export const translateText = async (text: string, targetLanguage: string = 'uz'): Promise<string | null> => {
    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            body: JSON.stringify({
                text: text,
                targetLanguage: targetLanguage
            }),
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            console.error('Translation network response was not ok:', response.statusText);
            return null;
        }

        const data = await response.json();
        return data.translatedText;
    } catch (error) {
        console.error('Error translating text:', error);
        return null;
    }
};


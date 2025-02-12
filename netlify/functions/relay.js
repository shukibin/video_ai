exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    try {
        const { message } = JSON.parse(event.body);
        const apiKey = process.env.OPENAI_API_KEY; // Store the key securely in Netlify's environment variables

        if (!message) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing message" }) };
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [{ role: "user", content: message }]
            })
        });

        const data = await response.json();
        return { statusCode: 200, body: JSON.stringify({ response: data.choices[0].message.content }) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: "Server Error" }) };
    }
};

import fetch from 'node-fetch';

const invokeUrl = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b"

const headers = {
    "Authorization": "Bearer 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",
    "Accept": "application/json",
}

const payload = {
  "prompt": "a macro wildlife photo of a green frog in a rainforest pond, highly detailed, eye-level shot",
  "width": 1024,
  "height": 1024,
  "seed": 0,
  "steps": 4
}

async function test() {
    try {
        let response = await fetch(invokeUrl, {
            method: "post",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json", ...headers }
        });

        if (response.status != 200) {
            let errBody = await response.text();
            console.error("invocation failed with status " + response.status + " " + errBody)
            return;
        }
        let response_body = await response.json()
        console.log("Keys:", Object.keys(response_body));
        console.log("Full response (truncated):", JSON.stringify(response_body).substring(0, 500));
    } catch (e) {
        console.error(e);
    }
}

test();

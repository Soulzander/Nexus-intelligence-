import fetch from 'node-fetch';

async function main() {
  try {
    const response = await fetch('https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl-base-1.0', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [{ text: "A cute cat" }]
      })
    });
    
    if (!response.ok) {
      console.error(await response.text());
    } else {
      const data = await response.json();
      console.log("Success! Data keys:", Object.keys(data));
      if (data.artifacts) console.log("Has artifacts");
    }
  } catch (e) {
    console.error(e);
  }
}

main();

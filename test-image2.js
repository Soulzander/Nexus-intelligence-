import fetch from 'node-fetch';

async function main() {
  try {
    const response = await fetch('https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [{ text: "A cute cat" }],
        cfg_scale: 5,
        sampler: "K_DPM_2_ANCESTRAL",
        seed: 0,
        steps: 25
      })
    });
    
    if (!response.ok) {
      console.error(await response.text());
    } else {
      console.log("Success!");
    }
  } catch (e) {
    console.error(e);
  }
}

main();

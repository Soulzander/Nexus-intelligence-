import fetch from 'node-fetch';

async function main() {
  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt: "A cute cat",
        model: "stabilityai/stable-diffusion-3-medium",
        response_format: "b64_json"
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

import fetch from 'node-fetch';

async function main() {
  const model = 'black-forest-labs/FLUX.2-klein-4B';
  console.log(`Testing ${model} on ai.api.nvidia.com...`);
  try {
    const response = await fetch(`https://ai.api.nvidia.com/v1/genai/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt: "A cute cat"
      })
    });
    
    if (!response.ok) {
      console.error(`Failed ${model}:`, await response.text());
    } else {
      console.log(`Success ${model}!`);
      const data = await response.json();
      console.log(Object.keys(data));
    }
  } catch (e) {
    console.error(e);
  }
}

main();

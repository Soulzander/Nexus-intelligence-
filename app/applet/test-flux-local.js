import fetch from 'node-fetch';

async function main() {
  const modelsToTest = [
    'black-forest-labs/flux-schnell',
    'black-forest-labs/flux-dev',
    'black-forest-labs/FLUX.2-klein-4B',
    'black-forest-labs/flux.2-klein-4b'
  ];

  for (const model of modelsToTest) {
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
      }
    } catch (e) {
      console.error(e);
    }
  }
}

main();

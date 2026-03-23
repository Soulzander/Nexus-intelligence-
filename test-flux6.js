import fetch from 'node-fetch';

async function main() {
  const models = [
    'black-forest-labs/flux-schnell',
    'black-forest-labs/flux-dev',
    'black-forest-labs/flux.1-schnell',
    'black-forest-labs/flux.1-dev'
  ];
  for (const model of models) {
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

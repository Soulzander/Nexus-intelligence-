async function main() {
  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: "black-forest-labs/flux-schnell",
        prompt: "A neon hologram of a cat driving at top speed"
      })
    });
    console.log(response.status, await response.text());
  } catch (e) {
    console.error(e.message);
  }
}
main();

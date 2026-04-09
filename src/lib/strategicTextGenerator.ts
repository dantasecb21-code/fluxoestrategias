/**
 * Formats user-provided text into a cleaner, more readable description.
 * Does NOT replace or invent content — uses the user's own words,
 * just reorganized in a friendlier way.
 */

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Simple connectors to make the text flow better
const connectors = [
  "pra deixar a loja mais atrativa pro cliente",
  "garantindo uma experiência melhor pro cliente",
  "ajudando a loja a se destacar na plataforma",
  "pra melhorar os resultados da loja",
  "deixando tudo mais organizado e profissional",
  "pra que o cliente tenha uma experiência melhor",
];

export function generateStrategicText(itemName: string): string {
  const name = itemName.trim();
  if (!name) return "";

  // Clean up the input — remove leading bullets/dashes
  const cleaned = name.replace(/^[-•*]\s*/, "").trim();
  
  // Capitalize the first letter
  const capitalized = capitalize(cleaned);
  
  // If already long enough (50+ chars), just return it formatted nicely
  if (capitalized.length >= 50) {
    return capitalized.endsWith(".") ? capitalized : `${capitalized}.`;
  }

  // For shorter texts, add a casual connector to make it feel more complete
  const connector = pickRandom(connectors);
  return `${capitalized}, ${connector}.`;
}

/**
 * Validates if a strategic text is coherent with the item name.
 * Returns a warning message if the text seems disconnected.
 */
export function validateStrategicText(itemName: string, text: string): string | null {
  if (!itemName.trim() || !text.trim()) return null;

  // Check if text is too short
  if (text.length < 20) {
    return "O texto está muito curto. Adicione mais detalhes sobre o que precisa ser feito.";
  }

  return null;
}

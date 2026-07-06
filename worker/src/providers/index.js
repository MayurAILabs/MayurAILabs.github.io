import * as gemini from "./gemini.js";

// Factory keyed off assistantConfig.provider. To add a new LLM provider:
//   1. Create providers/<name>.js exporting stream({...}) and generate({...})
//      with the same signature as providers/gemini.js.
//   2. Add it to this map.
//   3. Set `provider: "<name>"` in config/assistant.config.js.
// No other application code needs to change.
const PROVIDERS = {
  gemini,
};

export function getProvider(name) {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${name}`);
  }
  return provider;
}

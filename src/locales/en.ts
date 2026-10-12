import type {LocaleDefinition} from "./index.js";

export const english: LocaleDefinition = {
  id: "en",
  closingText: (profile) => `Thank you for ${profile.followers} followers`,
};

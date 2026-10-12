import type {LocaleDefinition} from "./index.js";

export const simplifiedChinese: LocaleDefinition = {
  id: "zh-CN",
  closingText: (profile) => `感谢 ${profile.followers} 位粉丝的支持`,
};

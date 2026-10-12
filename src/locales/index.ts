import type {LocaleId, Profile} from "../domain/types.js";
import {english} from "./en.js";
import {simplifiedChinese} from "./zh-CN.js";

export interface LocaleDefinition {
  id: LocaleId;
  closingText(profile: Profile): string;
}

const locales: Record<LocaleId, LocaleDefinition> = {en: english, "zh-CN": simplifiedChinese};

export function getLocale(id: LocaleId): LocaleDefinition {
  return locales[id];
}

export function parseLocale(value: string): LocaleId {
  if (value === "zh") return "zh-CN";
  if (value !== "en" && value !== "zh-CN") throw new Error(`Unsupported locale "${value}". Supported: en, zh-CN (alias: zh).`);
  return value;
}

import { archiveEntry } from "./archive-entry";
import { tag } from "./tag";
import { siteSettings } from "./site-settings";

export const schema = {
  types: [archiveEntry, tag, siteSettings],
}

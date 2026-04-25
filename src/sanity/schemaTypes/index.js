import { archiveEntry } from "./archive-entry";
import { tag } from "./tag";
import { siteSettings } from "./site-settings";
import { visualEssayImage } from "./visual-essay-image";
import { archiveMetadata } from "./archive-metadata";
import { widlineCadet } from "./artist-collaborations/widline-cadet";

export const schema = {
  types: [archiveEntry, tag, siteSettings, visualEssayImage, archiveMetadata, widlineCadet],
}

import { archiveEntry } from "./archive-entry";
import { tag } from "./tag";
import { siteSettings } from "./site-settings";
import { visualEssayImage } from "./visual-essay-image";
import { archiveMetadata } from "./archive-metadata";
import { widlineCadet } from "./artist-collaborations/widline-cadet";
import { author } from "./writings/author";
import { writingArticle } from "./writings/writing-article";
import { writingsSettings } from "./writings/writings-settings";

export const schema = {
  types: [
    archiveEntry,
    tag,
    siteSettings,
    visualEssayImage,
    archiveMetadata,
    widlineCadet,
    author,
    writingArticle,
    writingsSettings,
  ],
}

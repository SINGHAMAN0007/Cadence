export interface CleanedTrackMeta {
  title: string;
  artist: string;
  album: string;
}

/**
 * Sanitizes raw audio file tags, stripping file extensions, downloader/piracy watermarks,
 * bitrates (_320, 128kbps), standalone release years, marketing labels (e.g. "Coke Studio Bharat",
 * "New Hindi Song 2026"), and website domains.
 */
export function sanitizeMetadata(
  rawTitle: string,
  rawArtist?: string,
  rawAlbum?: string
): CleanedTrackMeta {
  const cleanString = (str: string, isAlbum = false): string => {
    if (!str) return "";
    let s = str;

    // 1. Strip audio file extensions (.mp3, .wav, .flac, .m4a, .aac, .ogg, .opus, etc.)
    s = s.replace(/\.(mp3|wav|flac|m4a|aac|ogg|opus|wma|aiff|m4b|weba|alac)$/gi, "");

    // 2. Bracketed or parenthesized quality & format tags: e.g. [320 Kbps], (320kbps), (128 kbps), [FLAC]
    s = s.replace(/[\(\[\{]\s*(?:320|256|192|128|64)\s*(?:kbps|k)?\s*[\)\]\}]/gi, " ");
    s = s.replace(/[\(\[\{]\s*(?:flac|lossless|cdrip|webrip|dbr|dvdrip|audio\s*rip|remastered|vbr|cbr)\s*[\)\]\}]/gi, " ");

    // 3. Bracketed or parenthesized downloader domains & brand watermarks e.g. [PagalWorld.com], (DJMaza.Info)
    s = s.replace(/[\(\[\{][^\)\]\}]*(?:pagalworld|pagalfree|pagaliw|pagalnew|pagalsongs|djmaza|naasongs|geetmp3|webmusic|songsuno|hungama|jiosaavn|gaana|wynk|mr-jatt|mrjatt|pendujatt|mp3mad|raagsong|indiamp3|remixmp3|songspk|freshmaza|bestwap|mp3skull|zippyshare|skullmp3|fakaza|starmusiq|masstamilan|isaimini|sensongs|djjohal|wapking|kuttyweb|\.com|\.in|\.net|\.org|\.co|\.vip|\.link|\.cc|\.me)[^\)\]\}]*[\)\]\}]/gi, " ");

    // 4. Remove URLs and domain watermarks anywhere in text
    s = s.replace(/\b(?:https?:\/\/|www\.)?[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\.(?:com|in|me|org|net|cc|vip|co|fm|top|link|site|info|icu|pw|live|xyz|app|club|mobi|io)\b/gi, " ");

    // 5. Downloader / piracy brand keywords (isolated or joined by _ or -)
    s = s.replace(/(?:^|[\s_\-\(\[\{])(?:pagalworld|pagalfree|pagaliw|pagalnew|pagalworldzone|pagalhits|pagalvip|pagalall|pagalsongs|pagal|djmaza|naasongs|geetmp3|webmusic|songsuno|hungama|jiosaavn|saavn|gaana|wynk|mr-jatt|mrjatt|pendujatt|mp3mad|raagsong|indiamp3|remixmp3|songspk|songs-pk|freshmaza|bestwap|mobile9|mp3skull|zippyshare|skullmp3|tubidy|fakaza|webmusicin|starmusiq|masstamilan|isaimini|sensongs|djjohal|wapking|kuttyweb|tamiltunes|mallumusic|kannadamasti)(?=[\s_\-\)\]\}]|$)/gi, " ");

    // 6. Bitrates and audio quality tags (e.g. _320, -320, 320kbps, _128, -128, 128kbps, etc.)
    s = s.replace(/(?:^|[\s_\-\(\[\{])(?:320|256|192|128|64)\s*(?:kbps|k)?(?=[\s_\-\)\]\}]|$)/gi, " ");
    s = s.replace(/\b(?:320|256|192|128|64)\s*kbps\b/gi, " ");
    s = s.replace(/(?:^|[\s_\-\(\[\{])(?:flac|lossless|cdrip|webrip|dbr|dvdrip|audio\s*rip|remastered)(?=[\s_\-\)\]\}]|$)/gi, " ");

    // 7. Channel, studio, and label tags (e.g. Coke Studio Bharat, Coke Studio, T-Series, Zee Music)
    s = s.replace(/(?:^|[\s_\-\(\[\{])(?:coke\s+studio\s+bharat|coke\s+studio\s+india|coke\s+studio\s+pakistan|coke\s+studio|t-series|zee\s+music\s+company|zee\s+music|zeemusic|speed\s+records|sony\s+music|tips\s+official|tips\s+music|yrf|saregama|aditya\s+music)(?=[\s_\-\)\]\}]|$)/gi, " ");

    // 8. Generic marketing, promo & video labels (e.g. "New Hindi Song 2026", "Official Video")
    s = s.replace(/(?:^|[\s_\-\(\[\{])(?:new|latest|trending)\s+[a-z]*\s*song\s*(?:20\d\d)?(?=[\s_\-\)\]\}]|$)/gi, " ");
    s = s.replace(/(?:^|[\s_\-\(\[\{])(?:full\s+(?:audio|video)\s+song|full\s+song|audio\s+song|video\s+song|audio\s+track|official\s+(?:audio|video|music\s+video|lyric(?:s)?|lyrical\s+video|teaser|trailer))(?=[\s_\-\)\]\}]|$)/gi, " ");

    // 9. Standalone release years (e.g. 2026, 2025, (2024), [2026], - 2026, _2026)
    s = s.replace(/[\(\[\{]\s*(?:19|20)\d{2}\s*[\)\]\}]/g, " ");
    s = s.replace(/(?:^|[\s_\-])(?:19\d{2}|20\d{2})(?=[\s_\-]|$)/g, " ");

    // 10. OST / soundtrack phrases
    s = s.replace(/[\(\[\{]?\s*(?:from\s+["\x27].*?["\x27]|original\s+motion\s+picture\s+soundtrack|original\s+soundtrack|ost)\s*[\)\]\}]?/gi, " ");

    // 11. Empty or unbalanced brackets
    s = s.replace(/\[\s*\]|\(\s*\)|\{\s*\}/g, " ");
    s = s.replace(/^[\)\]\}]+|[\(\[\{]+$/g, "");
    s = s.replace(/\[\s*\]|\(\s*\)|\{\s*\}/g, " ");

    // 12. Normalize whitespace, underscores, and separators
    s = s.replace(/[_\s]+/g, " ");
    s = s.replace(/^[\s\-–—:|/]+|[\s\-–—:|/]+$/g, "");
    s = s.replace(/\s{2,}/g, " ").trim();

    return s;
  };

  let cleanTitle = cleanString(rawTitle);
  let cleanArtist = cleanString(rawArtist || "");
  let cleanAlbum = cleanString(rawAlbum || "", true);

  // If cleanTitle contains "Artist - Title" and artist is missing or generic, split them
  if (cleanTitle.includes(" - ") && (!cleanArtist || cleanArtist === "Unknown Artist" || cleanArtist.toLowerCase() === "unknown")) {
    const parts = cleanTitle.split(" - ");
    cleanArtist = cleanString(parts[0].trim());
    cleanTitle = cleanString(parts.slice(1).join(" - ").trim());
  }

  // Fallbacks
  const fallbackTitle = rawTitle ? rawTitle.replace(/\.[a-z0-9]+$/i, "").replace(/[_\s]+/g, " ").trim() : "Unknown Track";

  return {
    title: cleanTitle || fallbackTitle || "Unknown Track",
    artist: cleanArtist || "Unknown Artist",
    album: cleanAlbum || "Single",
  };
}

export function sanitizeTrackTitle(title: string): string {
  return sanitizeMetadata(title).title;
}

export function sanitizeTrackArtist(artist?: string): string {
  return sanitizeMetadata('', artist).artist;
}

export function sanitizeTrackAlbum(album?: string): string {
  return sanitizeMetadata('', '', album).album;
}

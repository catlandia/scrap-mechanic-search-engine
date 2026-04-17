const SINGLE_LINE_TAGS = [
  "b",
  "i",
  "u",
  "s",
  "strike",
  "h1",
  "h2",
  "h3",
  "h4",
  "code",
  "noparse",
  "spoiler",
  "list",
  "olist",
  "ul",
  "ol",
  "*",
  "li",
  "center",
  "right",
  "left",
];

export function stripBBCode(input: string | null | undefined): string {
  if (!input) return "";
  let text = input;

  // [url=X]label[/url] → label
  text = text.replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, "$1");
  text = text.replace(/\[url\]([\s\S]*?)\[\/url\]/gi, "$1");

  // [img]...[/img], [previewyoutube=...]...[/previewyoutube] → drop entirely
  text = text.replace(/\[img\][\s\S]*?\[\/img\]/gi, " ");
  text = text.replace(/\[previewyoutube(?:=[^\]]*)?\][\s\S]*?\[\/previewyoutube\]/gi, " ");
  text = text.replace(/\[video(?:=[^\]]*)?\][\s\S]*?\[\/video\]/gi, " ");

  // [quote=...]...[/quote] → inner text
  text = text.replace(/\[quote(?:=[^\]]*)?\]([\s\S]*?)\[\/quote\]/gi, "$1");

  // Any remaining paired tags from the single-line list
  for (const tag of SINGLE_LINE_TAGS) {
    const open = new RegExp(`\\[${tag}(?:=[^\\]]*)?\\]`, "gi");
    const close = new RegExp(`\\[\\/${tag}\\]`, "gi");
    text = text.replace(open, "").replace(close, "");
  }

  // Any stray [tag] or [/tag] we did not handle
  text = text.replace(/\[\/?[a-zA-Z][a-zA-Z0-9*]*(?:=[^\]]*)?\]/g, " ");

  // HTML entities → plain
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Collapse whitespace
  text = text.replace(/\r\n?/g, "\n");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

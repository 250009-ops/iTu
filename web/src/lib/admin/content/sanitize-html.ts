/** Allow basic inline formatting for passage text. */
export function sanitizePassageHtml(html: string): string {
  if (!html.includes("<")) return html;

  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/<(?!(\/)?(b|strong|i|em|u|br|p)\b)[^>]+>/gi, "")
    .trim();
}

export function isHtmlContent(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

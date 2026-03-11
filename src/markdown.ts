/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 */

export function refLink(text: string, refid: string): string {
  return link(text, `{#ref ${refid} #}`);
}

export function link(text: string, href: string): string {
  return `[${text}](${href})`;
}

export const escape = {
  row(text: string): string {
    return text.replace(/\s*\|\s*$/, '');
  },

  cell(text: string): string {
    return text
      .replace(/^[\n]+|[\n]+$/g, '')
      .replace(/\|/g, '\\|')
      .replace(/\n/g, '<br/>');
  },
};

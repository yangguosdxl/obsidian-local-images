import got from "got";
import { fromBuffer } from "file-type";
import isSvg from "is-svg";

import { DIRTY_IMAGE_TAG } from "./config";
/*
https://stackoverflow.com/a/48032528/1020973
It will be better to do it type-correct.

*/
export async function replaceAsync(str: any, regex: any, asyncFn: any) {
  const promises: Promise<any>[] = [];
  str.replace(regex, (match: string, ...args: any) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

export function isUrl(link: string) {
  try {
    return Boolean(new URL(link));
  } catch (_) {
    return false;
  }
}

export async function downloadImage(url: string): Promise<ArrayBuffer> {
  const res = await got(url, { responseType: "buffer" });
  return res.body;
}

export async function fileExtByContent(content: ArrayBuffer) {
  const fileExt = (await fromBuffer(content))?.ext;

  // if XML, probably it is SVG
  if (fileExt == "xml") {
    const buffer = Buffer.from(content);
    if (isSvg(buffer)) return "svg";
  }

  return fileExt;
}

function recreateImageTag(match: string, anchor: string, link: string) {
  return `![${anchor}](${link})`;
}

export function clearContent(content: string) {
  const cleanContent = content.replace(DIRTY_IMAGE_TAG, recreateImageTag);
  return cleanContent;
}

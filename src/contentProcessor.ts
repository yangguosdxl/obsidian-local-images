import path from "path";
import fs from "fs";
import { URL } from "url";

import got from "got";
import { App, DataAdapter } from "obsidian";

import { fromBuffer } from "file-type";
import filenamify from "filenamify";
import { XXHash32 } from "ts-xxhash";
const FILENAME_TEMPLATE = "media";
const MAX_FILENAME_INDEX = 10;

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

export function imageTagProcessor(app: App, mediaDir: string) {
  async function processImageTag(
    match: string,
    anchor: string,
    link: string,
    offset: number
  ) {
    console.debug(
      `processImageTag#${offset}. anchor: "${anchor}". link: "${link}" `
    );

    try {
      // console.debug("dirtyFilePath, filePath", dirtyFilePath, filePath);

      const fileData = await downloadImage(link);

      const { fileName, needWrite } = await chooseFileName(
        app.vault.adapter,
        mediaDir,
        anchor,
        link,
        fileData
      );

      if (needWrite) {
        await app.vault.createBinary(fileName, fileData);
      }

      return `![${anchor}](${fileName})`;
    } catch (error) {
      console.warn("Image processing failed: ", error);
      return match;
    }
  }

  return processImageTag;
}

async function downloadImage(url: string): Promise<ArrayBuffer> {
  const res = await got(url, { responseType: "buffer" });
  return res.body;
}

const linksInfo: Record<string, number> = {};
async function chooseFileName(
  adapter: DataAdapter,
  dir: string,
  baseName: string,
  link: string,
  contentData: ArrayBuffer
): Promise<{ fileName: string; needWrite: boolean }> {
  const fileExt = (await fromBuffer(contentData))?.ext;

  // if there is no anchor try get file name from url
  if (!baseName) {
    const parsedUrl = new URL(link);

    baseName = path.basename(parsedUrl.pathname);
  }
  // if there is no part for file name from url use name template
  if (!baseName) {
    baseName = FILENAME_TEMPLATE;
  }

  // if filename already ends with correct extension, remove it to work with base name
  if (baseName.endsWith(`.${fileExt}`)) {
    console.debug("baseName.endsWith");
    baseName = baseName.slice(0, -1 * (fileExt.length + 1));
  }

  baseName = filenamify(baseName);

  console.debug(baseName);

  let fileName = "";
  let needWrite = true;
  let index = 0;
  while (!fileName && index < MAX_FILENAME_INDEX) {
    const suggestedName = index
      ? path.join(dir, `${baseName}-${index}.${fileExt}`)
      : path.join(dir, `${baseName}.${fileExt}`);

    console.debug("suggestedName ", suggestedName);
    if (await adapter.exists(suggestedName, false)) {
      ensureHashGenerated(link, contentData);

      const fileData = await adapter.readBinary(suggestedName);
      const fileHash = XXHash32.hash(0, fileData).toNumber();
      if (linksInfo[link] == fileHash) {
        fileName = suggestedName;
        needWrite = false;
      }
    } else {
      fileName = suggestedName;
    }

    index++;
  }
  if (!fileName) {
    throw new Error("Failed to generate file name for media file.");
  }

  ensureHashGenerated(link, contentData);

  return { fileName, needWrite };
}

function ensureHashGenerated(link: string, data: ArrayBuffer) {
  if (!linksInfo[link]) {
    linksInfo[link] = XXHash32.hash(0, data).toNumber();
    console.debug("linksInfo[link] ", linksInfo[link]);
  }
}

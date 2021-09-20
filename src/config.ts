export const FILENAME_TEMPLATE = "media";

export const MAX_FILENAME_INDEX = 1000;

export const EXTERNAL_MEDIA_LINK_PATTERN =
  /\!\[(?<anchor>.*?)\]\((?<link>.+?)\)/g;

export const DIRTY_IMAGE_TAG = /\[\!\[\[(?<anchor>.*?)\]\]\((?<link>.+?)\)\]/g;

export interface ISettings {
  include: string;
  mediaRootDirectory: string;
  cleanContent: boolean;
}

export const DEFAULT_SETTINGS: ISettings = {
  include: ".*\\.md",
  mediaRootDirectory: "media",
  cleanContent: true,
};

export const FILENAME_ATTEMPTS = 5;

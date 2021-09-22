export const FILENAME_TEMPLATE = "media";

export const MAX_FILENAME_INDEX = 1000;

export const FILENAME_ATTEMPTS = 5;

export const EXTERNAL_MEDIA_LINK_PATTERN =
  /\!\[(?<anchor>.*?)\]\((?<link>.+?)\)/g;

export const DIRTY_IMAGE_TAG = /\[\!\[\[(?<anchor>.*?)\]\]\((?<link>.+?)\)\]/g;

export interface ISettings {
  realTimeUpdate: boolean;
  realTimeUpdateInterval: number;
  cleanContent: boolean;
  showNotifications: boolean;
  include: string;
  mediaRootDirectory: string;
}

export const DEFAULT_SETTINGS: ISettings = {
  realTimeUpdate: false,
  realTimeUpdateInterval: 1000,
  cleanContent: true,
  showNotifications: false,
  include: ".*\\.md",
  mediaRootDirectory: "media",
};

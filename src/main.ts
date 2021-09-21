import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
} from "obsidian";
import safeRegex from "safe-regex";

import { imageTagProcessor } from "./contentProcessor";
import { replaceAsync, clearContent } from "./utils";
import {
  ISettings,
  DEFAULT_SETTINGS,
  EXTERNAL_MEDIA_LINK_PATTERN,
  UPDATE_MODIFIED_QUEUE_INTERVAL,
} from "./config";
import { UniqueQueue } from "./uniqueQueue";

export default class LocalImagesPlugin extends Plugin {
  settings: ISettings;
  modifiedQueue = new UniqueQueue<TFile>();

  private async proccessPage(file: TFile) {
    const content = await this.app.vault.read(file);

    // workaround to process newly created pages
    if (!content) {
      this.enqueueActivePage();
    }

    await this.ensureFolderExists(this.settings.mediaRootDirectory);

    const cleanContent = this.settings.cleanContent
      ? clearContent(content)
      : content;
    const fixedContent = await replaceAsync(
      cleanContent,
      EXTERNAL_MEDIA_LINK_PATTERN,
      imageTagProcessor(this.app, this.settings.mediaRootDirectory)
    );

    if (content != fixedContent) {
      await this.app.vault.modify(file, fixedContent);
    }

    new Notice(`Images for "${file.path}" were saved.`);
  }

  private async processActivePage() {
    const activeFile = this.app.workspace.getActiveFile();
    await this.proccessPage(activeFile);
  }

  private async processAllPages() {
    const files = this.app.vault.getMarkdownFiles();
    const includeRegex = new RegExp(this.settings.include, "i");

    const promises: Promise<void>[] = [];
    for (const file of files) {
      if (file.path.match(includeRegex)) {
        promises.push(this.proccessPage(file));
      }
    }

    await Promise.all(promises);
  }

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "download-images",
      name: "Download images locally",
      callback: this.processActivePage,
    });

    this.addCommand({
      id: "download-images-all",
      name: "Download images locally for all your notes",
      callback: this.processAllPages,
    });

    this.registerCodeMirror((cm: CodeMirror.Editor) => {
      // on("beforeChange") can not execute async function in event handler, so we use queue to pass modified pages to timeouted handler
      cm.on(
        "beforeChange",
        async (instance: CodeMirror.Editor, changeObj: any) => {
          if (changeObj.origin == "paste" || changeObj.origin == "input") {
            this.enqueueActivePage();
          }
        }
      );
    });

    this.registerInterval(
      window.setInterval(
        this.processModifiedQueue,
        UPDATE_MODIFIED_QUEUE_INTERVAL,
        this
      )
    );

    this.addSettingTab(new SettingTab(this.app, this));
  }

  async processModifiedQueue(self: LocalImagesPlugin) {
    let nextPage: TFile = null;
    while ((nextPage = self.modifiedQueue.pop())) {
      self.proccessPage(nextPage);
    }
  }

  enqueueActivePage() {
    const activeFile = this.app.workspace.getActiveFile();
    this.modifiedQueue.push(activeFile);
  }
  // It is good idea to create the plugin more verbose
  displayError(error: Error | string, file?: TFile): void {
    if (file) {
      new Notice(
        `LocalImages: Error while handling file ${
          file.name
        }, ${error.toString()}`
      );
    } else {
      new Notice(error.toString());
    }

    console.error(`LocalImages: error: ${error}`);
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    try {
      await this.saveData(this.settings);
    } catch (error) {
      this.displayError(error);
    }
  }

  async ensureFolderExists(folderPath: string) {
    try {
      await this.app.vault.createFolder(folderPath);
    } catch (error) {
      if (!error.message.contains("Folder already exists")) {
        throw error;
      }
    }
  }
}

class SettingTab extends PluginSettingTab {
  plugin: LocalImagesPlugin;

  constructor(app: App, plugin: LocalImagesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Local images" });

    new Setting(containerEl)
      .setName("Include")
      .setDesc(
        "Include only files matching this regex pattern when running on all notes."
      )
      .addText((text) =>
        text.setValue(this.plugin.settings.include).onChange(async (value) => {
          if (!safeRegex(value)) {
            this.plugin.displayError(
              "Unsafe regex! https://www.npmjs.com/package/safe-regex"
            );
            return;
          }
          this.plugin.settings.include = value;
          await this.plugin.saveSettings();
        })
      );
  }
}

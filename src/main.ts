import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
} from "obsidian";
import safeRegex from "safe-regex";

import { replaceAsync, imageTagProcessor } from "./contentProcessor";
export interface ISettings {
  include: string;
  mediaRootDirectory: string;
}

const EXTERNAL_MEDIA_LINK_PATTERN = /\!\[(?<anchor>.*?)\]\((?<link>.+?)\)/g;

const DEFAULT_SETTINGS: ISettings = {
  include: "*.md",
  mediaRootDirectory: "media",
};

export default class LocalImagesPlugin extends Plugin {
  settings: ISettings;

  async ensureFolderExists(folderPath: string) {
    try {
      await this.app.vault.createFolder(folderPath);
    } catch (error) {
      if (!error.message.contains("Folder already exists")) {
        throw error;
      }
    }
  }

  async onload() {
    console.log("loading plugin");

    await this.loadSettings();

    this.addStatusBarItem().setText("Status Bar Text");

    this.addRibbonIcon("dice", "Sample Plugin", async () => {
      const activeFile = this.app.workspace.getActiveFile();
      const content = await this.app.vault.read(activeFile);
      await this.ensureFolderExists(this.settings.mediaRootDirectory);

      const fixedContent = await replaceAsync(
        content,
        EXTERNAL_MEDIA_LINK_PATTERN,
        imageTagProcessor(this.app, this.settings.mediaRootDirectory)
      );

      console.debug(`fixed Content: `, fixedContent);

      await this.app.vault.modify(activeFile, fixedContent);

      new Notice("This is a notice!");
    });
    /*  this.addCommand({
      id: "download-images-all",
      name: "Download images locally for all your notes",
      callback: async () => {
        try {
          await runAll(this);
        } catch (error) {
          this.displayError(error);
        }
      },
    });

    this.addCommand({
      id: "download-images",
      name: "Download images locally",
      callback: async () => {
        const currentFile = this.app.workspace.getActiveFile();

        if (!currentFile) {
          return this.displayError("Please select a file first");
        }

        await run(this, currentFile);
      },
    }); */

    this.addSettingTab(new SampleSettingTab(this.app, this));
  }
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

  onunload() {
    console.log("unloading plugin");
  }

  async loadSettings() {
    console.log("loading settings");

    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    console.log("saving settings");

    try {
      await this.saveData(this.settings);
    } catch (error) {
      this.displayError(error);
    }
  }
}

class SampleSettingTab extends PluginSettingTab {
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

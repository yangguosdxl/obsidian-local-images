import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import safeRegex from "safe-regex";

import { imageTagProcessor } from "./contentProcessor";
import { replaceAsync, clearContent } from "./utils";
import {
  ISettings,
  DEFAULT_SETTINGS,
  EXTERNAL_MEDIA_LINK_PATTERN,
} from "./config";

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

  private async proccessPage(file: TFile) {
    const content = await this.app.vault.read(file);
    await this.ensureFolderExists(this.settings.mediaRootDirectory);

    const cleanContent = this.settings.cleanContent
      ? clearContent(content)
      : content;
    const fixedContent = await replaceAsync(
      cleanContent,
      EXTERNAL_MEDIA_LINK_PATTERN,
      imageTagProcessor(this.app, this.settings.mediaRootDirectory)
    );

    await this.app.vault.modify(file, fixedContent);

    new Notice(`Images for "${file.path}" were saved.`);
  }

  async onload() {
    console.log("loading plugin");

    await this.loadSettings();

    this.addCommand({
      id: "download-images",
      name: "Download images locally",
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        await this.proccessPage(activeFile);

        this.app.workspace.iterateAllLeaves(async (leaf: WorkspaceLeaf) => {
          console.dir(leaf);
        });
      },
    });

    this.addCommand({
      id: "download-images-all",
      name: "Download images locally for all your notes",
      callback: async () => {
        const files = this.app.vault.getMarkdownFiles();
        const includeRegex = new RegExp(this.settings.include, "i");

        const promises: Promise<void>[] = [];
        for (const file of files) {
          if (file.path.match(includeRegex)) {
            promises.push(this.proccessPage(file));
          }
        }

        await Promise.all(promises);
      },
    });

    this.addSettingTab(new SettingTab(this.app, this));
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

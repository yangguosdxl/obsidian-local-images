# Obsidian local images

**This plugin is in early development, backups are a good idea ;)**

Finds hotlinked images in your notes, downloads and saves them locally and finally adjusts the link in your note to point to the local file.

![](docs/obsidian-local-images-sep2021.gif)

For me it is useful when I copy paste parts from web-pages, I want to keep images near the text that refers to them.

![](docs/obsidian-local-images-html-sep2021.gif)

Use it with commands:

**Download images locally** -- your active page will be processed.

or

**Download images locally for all your notes** -- will be processed all the pages in your vault, that corresponds to **Include** parameter in the plugin's settings.

Also you can turn on in plugin's settings processing the active page when external links pasted into the page.

This plugin was developed from [niekcandaele's](https://github.com/niekcandaele/obsidian-local-images) code base. Key principles for downloading, saving were given there, and some texts too. Even the plugin's name is original.

## Development

```
# Start the bundler in watch mode
npm run dev

# It's useful to set a symlink so you don't have to copy files over constantly
ln -s /home/user/code/obsidian-local-images /home/user/notes/dev/.obsidian/plugins/local-images
```

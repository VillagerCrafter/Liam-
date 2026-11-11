# Liam Bennicoff - Brand Experiences

A Jekyll site for Liam's brand activation, event, marketing, and content portfolio. It is built as a static site and deploys through the existing GitHub Pages Actions workflow.

## Editing the site

- Update project cards, descriptions, categories, and image paths in `_data/projects.yml`.
- Update service cards and their expanded examples in `_data/services.yml`.
- Change the booking page, email, and social links in `_config.yml`.
- Add image files under `assets/images/`, then point the matching data entry at `/assets/images/your-image.jpg`.
- The inquiry form opens the visitor's email application with a prepared email to the configured address. It does not store or send form data on its own.

The hero uses a small looping excerpt from the supplied `GX010514.MP4` rather than the original 2.25 GB camera file. Keep the web copy at `assets/videos/gx010514-loop.mp4`; replace that file with a similarly optimized H.264 MP4 when updating the footage.

## Local preview

With Ruby and Bundler installed:

```powershell
bundle install
bundle exec jekyll serve
```

On Windows with RubyInstaller, run `ridk install 3` first to install the MSYS2 and MINGW toolchain needed to build native gems.

Open the local URL printed by Jekyll. The deployed site is built by `.github/workflows/pages.yml`.

## Local administrator editor

On Windows, run `.\Launch-Website-Editor.ps1` in PowerShell. It asks for the administrator password without displaying it, starts the local preview server, then opens the public preview and administrator editor in separate browser windows. The editor uses Ruby's WEBrick and Liquid gems; install Liquid with `gem install liquid` if it is missing. The normal preview server runs on port 8765, or the next available port through 8795.

The editor is a local content-management workspace. Double-click text to edit it; double-click an image or video to replace it. The grouped left toolbar edits links, image descriptions, sizing, positioning, colors, typography, and effects; imports fonts; adds page sections, portfolio projects, and editable headings, text, and photos to any section; reorders sections and added content; and restores hidden elements. Its Design tab includes eight image resize handles, right-click crop/resize tools (with drag-to-crop and drag-to-resize), rotating hero videos (up to 12, reorderable/removable), animation presets and photo rotators, custom linked buttons, and the complete Google Fonts family catalog. Undo and redo restore the canvas in place without reloading or changing your scroll position.

The Page sections panel can select, reorder, rename, hide, restore, duplicate, and remove added sections. Duplicated sections retain their editable content and styling; interactive sections containing forms, embeds, or video are intentionally not duplicated. New sections can start from an editorial layout or a Challenge / Approach / Result project-story layout. Desktop, tablet, and mobile preview controls change the editor canvas width without changing the public design. The editor keeps up to five snapshots of the previously published content in this browser before each update; restore loads a snapshot as a draft and does not publish it.

Portfolio cards open stable case-study URLs at `/projects/?project=<project-id>`. Existing project IDs come from `_data/projects.yml`; editor-created projects receive stable IDs and can be edited in the selected-project panel. The **Preview case study page** control opens a private local draft preview in a new tab; it does not modify the public site. Project details are still published through the existing static `site-content.json` workflow.

The Elements tab searches Openverse and shows source/license information before importing an image; imported images retain a visible credit and license link. Pixabay, Unsplash, and Pexels links open searches for the same query; import images from Openverse to preserve local copies and license credits. The AI copy assistant lets you drag-select a heading or paragraph, send a prompt to Anthropic Claude, review three alternatives, and apply one only after choosing it. To create your own API key, sign in at [Anthropic Console API keys](https://console.anthropic.com/settings/keys), create a key, and enter it at the optional hidden prompt when launching the editor. The key is a private credential; this project cannot issue one for you. It is held by the local server process and is not written to a file; selected copy and the prompt are sent to Anthropic only when you request suggestions. Google Fonts are loaded from Google when selected.

Changes save as a local browser draft until **Update website** writes them to `site-content.json` and uploads selected files into `uploads/`. The public preview window refreshes when published.

**Local-only security and publishing:** the password is requested at startup and held in the local server's memory; it is not embedded in the site or committed to the repository. The administrator routes are protected by a local session and the preview server binds only to `127.0.0.1`. This is not a secure, remotely hosted login: GitHub Pages serves static files and cannot enforce the editor's password or protect its data. Updating the paired preview also does not deploy to GitHub. To publish edits online, review and commit the updated `site-content.json` and uploaded media, then deploy through the repository's configured Pages workflow. The AI feature requires an Anthropic account/API key; Openverse and Google Fonts require an internet connection. Review third-party media licenses before use.

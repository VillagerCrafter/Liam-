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

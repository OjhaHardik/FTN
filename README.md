# FTN World website (front end)

The new website for FTN World, an architecture, interiors, landscape and planning practice in Haldwani and Dehradun.

This repo holds the front end only: plain HTML, CSS and JavaScript, with no build step.

## View it

- **Live preview:** https://ojhahardik.github.io/FTN/ (GitHub Pages)
- **On your computer:** serve the folder with any static server and open the address it prints. For example:
  - VS Code **Live Server**: right-click `index.html`, then "Open with Live Server".
  - `python -m http.server 8000`, then http://localhost:8000
  - `npx serve`

Opening `index.html` straight from the file system also mostly works. A local server is closer to the real site.

## What to look at

| Page | What it is |
|---|---|
| `index.html` | The home page. It has a loading intro, a hero drawing that draws itself, and scroll effects. |
| `estimate.html` | The fee estimator, embedded from ftn-estimate.ai.studio. |
| `404.html` | The "page not found" screen. |

**Tips**
- **Replay the intro:** add `?intro=1` to the address. The intro shows once per browser tab.
- **Light and dark:** the half-circle button in the top bar switches between them. The site starts in your device's setting.
- **Sizes:** check at desktop width and at phone width (390 px). The layout changes at 1100, 900 and 560 px.

## Things that are placeholders

- The project photos are stand-ins from Unsplash/Picsum. FTN's real project photos will replace them.
- The enquiry form in the footer is not connected in this preview. The PHP backend that stores enquiries runs on the BigRock hosting and is not in this repo.

## Structure

```
index.html  estimate.html  404.html
frontend/
  css/app.css      all styles; colours and sizes are tokens at the top
  js/app.js        intro, smooth scroll, hero drawing, scroll effects, light/dark, form
  vendor/          GSAP, ScrollTrigger and Lenis (local copies)
  fonts/           Urbanist (headings) and Geist (text)
  img/             stand-in photos
  brand/           logo SVGs and favicon
```

The design source is the "FTN World" Figma file. Colour and text style names there match the tokens in `app.css`.

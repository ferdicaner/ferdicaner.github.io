# Ferdi Caner Bayram · Resume

A personal resume site in a Novorésumé-style layout, plus a resume builder app. Plain HTML, CSS and JavaScript, no build step.

| Path | Address | What it is |
| --- | --- | --- |
| `resumebuilder/resume/` | `/resumebuilder/resume/` | The resume site and its PDF |
| `resumebuilder/` | `/resumebuilder/` | The resume builder app |
| `index.html` | `/` | Forwards ferdicaner.github.io to the resume site |

## Resume site

| File | Purpose |
| --- | --- |
| `resumebuilder/resume/index.html` | All resume content |
| `resumebuilder/resume/styles.css` | Screen, mobile and print styles |
| `resumebuilder/resume/Ferdi_Caner_Bayram_Resume.pdf` | The file behind the PDF button |
| `resumebuilder/resume/favicon.svg` | Browser tab icon |

To update the PDF after editing, open the resume site in Chrome, press Ctrl+P, choose **Save as PDF**, turn off **Headers and footers**, and save over `Ferdi_Caner_Bayram_Resume.pdf`. The print styles produce the Letter-size, paginated layout automatically.

## Resume Builder

A form on the left, a live preview on the right, two templates (header block and sidebar), accent color and font choice, drag-and-drop ordering, several resumes, JSON import/export, and PDF through the browser's print window. Everything is stored in the visitor's own browser; nothing is sent anywhere.

| File | Purpose |
| --- | --- |
| `resumebuilder/index.html` | Page shell |
| `resumebuilder/app.js` | Editor, storage, import/export, printing |
| `resumebuilder/render.js` | Turns resume data into template HTML |
| `resumebuilder/resume.css` | Both templates, screen and print |
| `resumebuilder/builder.css` | Editor interface |
| `resumebuilder/data.js` | Sample resume loaded on first visit |
| `resumebuilder/manifest.webmanifest`, `resumebuilder/icons/` | Lets browsers install the builder as an app |
| `resumebuilder/sw.js` | Offline support: caches the app, fonts and the drag-and-drop library |

The builder can be installed from Chrome or Edge (the **Install** button, or the install icon in the address bar) and on phones through **Add to Home Screen**. After the first visit it opens without an internet connection. App files refresh in the background, so a new version shows up on the next launch.

## Publish with GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)`. The root `index.html` must stay; GitHub Pages serves it at ferdicaner.github.io.

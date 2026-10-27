# Ferdi Caner Bayram · Resume

Personal resume site in a Novorésumé-style layout. Plain HTML and CSS, no build step.

| File | Purpose |
| --- | --- |
| `index.html` | All resume content |
| `styles.css` | Screen, mobile and print styles |
| `Ferdi_Caner_Bayram_Resume.pdf` | The file behind the PDF button |
| `favicon.svg` | Browser tab icon |

## Resume Builder

`builder/` is a separate editor at `/builder/`: a form on the left, a live preview on the right, two templates (header block and sidebar), accent color and font choice, drag-and-drop ordering, several resumes, JSON import/export, and PDF through the browser's print window. Everything is stored in the visitor's own browser; nothing is sent anywhere.

| File | Purpose |
| --- | --- |
| `builder/index.html` | Page shell |
| `builder/app.js` | Editor, storage, import/export, printing |
| `builder/render.js` | Turns resume data into template HTML |
| `builder/resume.css` | Both templates, screen and print |
| `builder/builder.css` | Editor interface |
| `builder/data.js` | Sample resume loaded on first visit |

## Publish with GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)`.

## Update the PDF after editing

Open the site in Chrome, press Ctrl+P, choose **Save as PDF**, turn off **Headers and footers**, and save over `Ferdi_Caner_Bayram_Resume.pdf`. The print styles produce the Letter-size, paginated layout automatically.

# Applying the Clube do Filme logo to the app

Four small edits to your `client/` code. Nothing here touches your data or build.

---

## 1. Favicon  → `client/public/favicon.svg`
Replace the existing file with **`favicon.svg`** from this folder. That's it — `index.html`
already points at `/favicon.svg`, so the browser tab + PWA icon update automatically.

## 2. Nav logo → `client/src/components/Nav.jsx`
Replace the whole file with **`Nav.jsx`** from this folder. The only change vs. your
current file is the brand link — it now renders the clapperboard mark + the wordmark
(with a gold "Filme"). All nav/auth/bottom-bar logic is untouched.

## 3. Brand styles → `client/src/styles.css`
Open **`styles-brand.css`** in this folder and follow its two notes:
- **Replace** your existing `.brand { … }` rule with the new one (+ the `.brand-mark`,
  `.brand-text`, `.brand-accent` rules).
- *(optional)* replace `.login-brand { … }` to match, and update the Login title markup.

## 4. Load Poppins → `client/index.html`
The wordmark uses **Poppins**. In the Google Fonts `<link>` in `index.html`, add the
family. Replace the existing fonts link with:

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@600;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet" />
```

*(Prefer to keep your current Playfair brand font instead of Poppins? Skip step 4 and
change `font-family` in the `.brand-text` rule to `'Playfair Display', serif`.)*

---

### Palette (for reference, if you later want to warm up the rest of the UI)
| Token  | Hex       |
|--------|-----------|
| Gold   | `#F5B73D` |
| Velvet | `#EC5D56` |
| Plum   | `#181020` |
| Cream  | `#F7EFE2` |

The mark is built from plain SVG (no images), so it stays crisp at any size and inherits
the gold/plum colors inline — no extra assets to ship.

# Local Logo Folder

Drop SVG logos in this folder using ticker-based filenames:

- `TSLA.svg`
- `NVDA.svg`
- `ABB.svg`

The app resolves logos as `/logos/<SYMBOL>.svg`.

Symbol aliases currently supported:

- `ABB LTD` -> `ABB`
- `ABBLTD` -> `ABB`
- `GOOGLE` -> `GOOGL`

If a symbol SVG is missing, the UI falls back to a placeholder image.

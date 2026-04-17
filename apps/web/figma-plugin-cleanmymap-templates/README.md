# CleanMyMap Figma Plugin (Local)

## Files
- `manifest.json`
- `code.js`

## Single Entry Point
- Entrée unique plugin: `manifest.json` -> `main: "code.js"`.
- Le script doublon `apps/web/scripts/figma-cleanmymap-templates.js` a été retiré pour éviter la divergence.

## Import In Figma Desktop
1. Open Figma Desktop.
2. Go to `Plugins > Development > Import plugin from manifest...`
3. Select:
`C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main\apps\web\figma-plugin-cleanmymap-templates\manifest.json`
4. Run:
`Plugins > Development > CleanMyMap Templates Generator`

## Output
- Reusable components shelf (light + dark).
- 2 full templates (Light / Dark).
- Header with visible mode toggle and language toggle.

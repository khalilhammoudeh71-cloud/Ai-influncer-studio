# Video Studio composer

The video description is a real empty textarea with the placeholder “Describe the scene”. A 250px minimum height and defined outer border make the writing area clear. Clearing a saved video draft persists an empty value, so old prompts do not return after reload.

Generate, Edit and Extend remain tabs, with their existing generation callbacks and validation. Their secondary descriptions and the long Video Studio header paragraph are removed. The lower toolbar sits inside the composer and uses labeled icons for references, persona, company/model picker, duration, shape, resolution, expression, intensity, audio, prompt enhancement and generation. Native hover titles show the purpose and current selection. The model and generation titles include the existing catalog cost estimate. Native selects remain over the icon targets for keyboard and mobile interaction. Expression intensity remains disabled for From prompt. The toolbar wraps on small screens.

The idle showcase reads the live video catalog and selects the newest numeric model per creator, up to four creators. It no longer uses fixed Kling 1.5, MiniMax v2, Luma or Runway Gen-3 marketing slides. No model availability or sample provenance is fabricated. Catalog updates automatically change the displayed names. Reduced-motion preferences disable rotation.

Validation: newest-per-creator and empty-catalog tests; model-company, media-default and expression regressions (13 passing); TypeScript and production build. Browser checks cover placeholder behavior, native icon selects, duration titles, expression/intensity, audio toggle and mobile wrapping with no horizontal overflow. No paid generation required.

Edit and Extend share the same prompt composer and icon controls as Generate. Their upload menu and saved library accept videos only. A file-type guard rejects images/audio, and uploaded clips retain their video bytes instead of being converted to still images. Switching between Edit and Extend retains the clip; switching to Generate clears it. Extend can capture the final frame of an uploaded clip locally, with the existing server fallback for remote clips. Uploading disables tab changes and submission while the file is read.

Validation: 14 focused tests passed, TypeScript and production build passed. Browser testing uploaded a sample MP4 in Edit and Extend, checked all file accept filters, and captured its final frame without paid generation.

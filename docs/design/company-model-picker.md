# Shared company / model picker

All model and engine controls use CompanyModelSelect: a compact trigger and native modal dialog with company navigation on the left and the company's models on the right. Both columns remain visible at phone widths. Search matches company, model and service labels. Default/Automatic choices stay above the company lists where the originating control supplies them.

Creators are inferred first from the model name and endpoint ID, then from recognized publisher metadata. Hosting platforms are not treated as creators. Unknown publishers remain Other creators. Models sort newest numeric versions first; current Nano Banana generation is promoted within Google's image choices. Provider labels, prices embedded in the original choices, selected IDs and disabled flags are retained. Selecting a model invokes the original field callback; it never starts generation or a call.

Migrated surfaces:

- Image Studio, Video Studio, talking avatars, editing and upscaling.
- Visual Generator and its two-model comparison, batch images, carousel sequences, inpainting, motion controls, video extension, story chains and 3D.
- Image lightbox, reference sheets and library upscaling.
- Voice Studio engines, ElevenLabs speech models and voice-to-video models.
- Persona creation voice catalog, legacy cloning studio, voice design/remix and speech models.
- Talking Head engine and HeyGen avatar versions.
- Persona chat controls, direct-call speech/provider controls, Super Agent planning and conversation models, and repair models.
- Account image/video model defaults.

Voice presets and saved individual voices remain ordinary voice selectors; they select a speaker, rather than a generation model. Formats, languages, personas and other non-model controls retain their existing behavior.

Validation: creator grouping and newest-first tests; media defaults and voice catalog regression tests; TypeScript; production build. Browser checks cover company switching, selection callbacks, search, disabled voice models, Escape/Close and focus restoration. At 390×608 the picker keeps two columns without horizontal overflow. No paid generation required.

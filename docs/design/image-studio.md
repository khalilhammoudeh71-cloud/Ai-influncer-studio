# Image Studio

A first-time creator should be able to choose a persona, describe a scene in everyday words, and generate a photo without choosing an AI model.

The description and gold Generate photo button lead the page. The saved persona stays beside the brief; it uses the existing identity pipeline. Photo shape and optional visual references are the only other primary controls. Three example descriptions help users start without submitting a generation. Expressions, model choice, quality, quantity, saved references, styles and adapters sit under native More options disclosure.

Desktop places the brief beside the result. Below 760px it stacks the brief first. Results have an honest empty state, busy state, explicit enlargement and download, existing editing/saving controls and keyboard-accessible recent photo buttons. Selecting a recent photo no longer opens it full-screen unexpectedly.

Use the existing charcoal, ivory and brass semantic tokens, quiet borders, 12–20px corner radii, 16px description text and a 48px primary action. Keep native selects and disclosure for reliable keyboard/mobile use. The main action is disabled for blank descriptions, busy work, unavailable models and missing references required by the selected model.

Validation: TypeScript and production build; actual CreateView browser preview, description examples, shape, expression and disclosure interactions, desktop/mobile layout; live production smoke check. No provider generation charges required for UI validation.

The Change reference photo action beside the persona opens their saved photo library. Choosing a photo and pressing Use as reference persists the primary reference, preserves the old photo, clears its cached face descriptor, and makes the selected photo the first approved identity anchor. Cancel/Escape leaves the persona unchanged. Prompt text is 14px.

## November 8 refinements

The main form exposes the model chooser. Persona and model share a compact header; the 180px prompt uses 13px text. Photo shape and camera angle split a row equally. Default leaves the original prompt untouched; 24 explicit camera viewpoints append a camera instruction to image generation requests. Add a reference opens two choices: the combined persona library or device upload. Example buttons, helper copy and estimated duration are removed. The result toolbar places Download, Edit Image, Upscale 4K and Save to Library on one row. More options precedes the generation action in a reserved footer; upper fields scroll independently so Generate Photo stays visible above mobile navigation at short viewport heights.

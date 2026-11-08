# Image Studio

A first-time creator should be able to choose a persona, describe a scene in everyday words, and generate a photo without choosing an AI model.

The description and gold Generate photo button lead the page. The saved persona stays beside the brief; it uses the existing identity pipeline. Photo shape and optional visual references are the only other primary controls. Three example descriptions help users start without submitting a generation. Expressions, model choice, quality, quantity, saved references, styles and adapters sit under native More options disclosure.

Desktop places the brief beside the result. Below 760px it stacks the brief first. Results have an honest empty state, busy state, explicit enlargement and download, existing editing/saving controls and keyboard-accessible recent photo buttons. Selecting a recent photo no longer opens it full-screen unexpectedly.

Use the existing charcoal, ivory and brass semantic tokens, quiet borders, 12–20px corner radii, 16px description text and a 48px primary action. Keep native selects and disclosure for reliable keyboard/mobile use. The main action is disabled for blank descriptions, busy work, unavailable models and missing references required by the selected model.

Validation: TypeScript and production build; actual CreateView browser preview, description examples, shape, expression and disclosure interactions, desktop/mobile layout; live production smoke check. No provider generation charges required for UI validation.

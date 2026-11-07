# Expression and persona identity

Identity references describe stable anatomy and likeness, rather than a frozen smile, eyelid position or pose. Image prompt building and enhanced prompts now append an expression policy after persona appearance descriptions. Explicit requested expressions take priority; requests to retain the original expression still apply. No expression is forced when none is specified.

Identity review allows natural expression deformation, including closed eyes when enough other facial structure remains comparable. Identity confidence thresholds, required references and rejection handling are unchanged. Video identity instructions also allow natural facial movement.

Validation: prompt regression tests and existing media-quality tests (11 passing), TypeScript check and API bundle import. A bounded direct OpenAI test used the application prompt builder and identity checker with one saved reference for six expressions. Five initial requests completed; the surprise request was provider-rejected. One follow-up used a plain clothed portrait request without inherited persona niche/tone metadata and completed. All six rendered images passed the automatic identity check; assistant visual review retained likeness. Closed-eyes output retained a faint smile, so expression fidelity remains imperfect. These are image experiments, not a new browser/video acceptance trial or statistical guarantee. No human feedback was written and no generated image was added as an identity reference.

Local, private results: reports/expression-acceptance/review.html. Do not commit reference photos, generated images, raw persona prompts or usage artifacts to the public source repository.

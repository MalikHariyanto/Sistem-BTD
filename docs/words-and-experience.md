# Words & experience notes

## Verifiable words, personal wishes

This gift uses three literary excerpts, followed by original Indonesian birthday wishes. It does not claim a ranking of the world's most romantic people or pretend that a historical writer addressed the recipient. Only Rossetti's poem is titled _A Birthday_; it uses birthday as a metaphor for love. Shakespeare's line is about time and affection. Dickinson's line is a promise of enduring love. Indonesian versions are explicitly labelled **Terjemahan bebas** inside the expandable source notes; the birthday wishes themselves are original site copy.

Checked against the following public-domain texts, available in Project Gutenberg's GITenberg mirrors:

- **Christina Rossetti, “A Birthday”**, in _Goblin Market, The Prince's Progress, and Other Poems_. [Project Gutenberg #16950](https://www.gutenberg.org/ebooks/16950), [verified text](https://github.com/GITenberg/Goblin-Market-The-Prince-s-Progress-and-Other-Poems_16950/blob/master/16950.txt). “Because the birthday of my life / Is come, my love is come to me.”
- **William Shakespeare, Sonnet 104**. [Project Gutenberg #1041](https://www.gutenberg.org/ebooks/1041), [verified text](https://github.com/GITenberg/Shakespeare-s-Sonnets_1041/blob/master/1041.txt). “To me, fair friend, you never can be old,”
- **Emily Dickinson, “Proof”**, _Poems: Three Series, Complete_, Series One, Love VIII. [Project Gutenberg #12242](https://www.gutenberg.org/ebooks/12242), [verified text](https://github.com/GITenberg/Poems-by-Emily-Dickinson-Three-Series-Complete_12242/blob/master/12242.txt). “That I shall love alway, / I offer thee”. The historical edited edition titles the poem “Proof”; this is not a claim about Dickinson's own titling.

Google and Poetry Foundation requests were denied by the environment's network policy. The linked GITenberg texts were retrieved successfully and the passages checked directly. Nothing is presented as a Google result.

## Experience decisions

- Poems retain paginated reading. Wishes use three independent flower buttons: Bahagia, Bertumbuh, and Dicintai. Each opens its own note in the order selected, with earlier notes retained. There is no next/previous wish control. Literary excerpts, translations, and original sources sit in native expandable details, separate from the personal wish. Returning to the chapter keeps the garden; replay closes the flowers and source notes.

- One chapter per viewport, continuous cross-dissolve with a slight camera shift. Reading stays in the story; only the authoring editor uses a dialog. Long letter content is paginated, not opened in a scrolling modal. Very small screens can scroll the active scene for accessibility.
- A greeting cannot appear during the camera move. Explicit phases: idle → countdown → traveling → revealed. All opening copy and the countdown are hidden before `travel()` begins; reveal runs only after the renderer finishes and settles. Skipping cancels stale work.
- Use 209 distinct photo slots, including 200 orbit uploads. The distant view contains no visible photo tiles. As the camera approaches, the same disk material resolves into photographs, without a scatter-to-grid animation. Empty apertures remain until the author adds their own photos. Bulk upload fills up to 200 orbit slots; original keys are preserved. Existing local database keys are retained.
- The final birthday scene is a destination, not an ornament: a large illuminated cake, three visible steps, then a primary button labelled **Tiup lilinnya**. No hidden gesture, microphone prompt, countdown pressure, or requirement to physically blow at a device. A second cue says **Cukup ketuk tombolnya. Tidak perlu meniup layar.**
- Flame and glow fade first; a short smoke trail and warm particles mark the action; only then does the birthday greeting appear. The recipient decides when to start. The wish can be repeated.
- Real buttons, keyboard focus, named scene landmarks, inactive scenes marked `inert`, audible autoplay when the browser permits it, a first-tap fallback when blocked, one continuous trimmed background song with device volume instead of in-page music switches, and reduced-motion alternatives. Motion is intentional; reading content never advances on a timer.
- The gravitational lens is a photographic reconstruction from the user’s visual references, not a physical relativity simulation. Two image-editing outputs provide the wide view and a close-up detail level (normalized crop x=.513, y=.360, w=1/3, h=1/3). Detail fades across feathered edges; disk-bound photographs use the exact same camera. Photo thumbnails are resized in memory, animation is capped at 30 fps / DPR 2 with a 3840×2160 budget, and rendering stops at rest or when hidden.

## Local typefaces

Cormorant Garamond (Latin 400 normal/italic) and DM Sans (Latin 400 normal) are bundled in `public/fonts/` under their SIL Open Font Licenses, included alongside the files. Source packages: `@fontsource/cormorant-garamond@5.2.6` and `@fontsource/dm-sans@5.2.6`, retrieved through npm's verified package download. Three WOFF2 files total approximately 61 KB. There are no runtime font requests to Google or any third-party service. Serif/sans-serif system fallbacks remain available.

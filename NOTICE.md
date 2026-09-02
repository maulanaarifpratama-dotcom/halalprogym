# Third-party notices

## This is a fork

**Halal Pro Gym** is a fork of [**openGym**](https://gitlab.com/DuarteSantos8/opengym) by
Duarte Santos, used and redistributed under the **GNU AGPL v3.0** (see [LICENSE](LICENSE)).
Their copyright on the inherited code stands; this fork's own changes are likewise AGPL v3.0.

Halal Pro Gym replaces openGym's storage, authentication and UI layers, and adds Indonesian
localisation, prayer-time-aware scheduling and a Ramadan training mode. The training-domain
logic (progression rules, estimated 1RM, fatigue/recovery model, the in-session workout state
machine and its supersets, warm-ups, drop-sets and rest-pause handling) is derived from
openGym's `frontend/src/lib`, ported to TypeScript.

Because this fork is deployed as a network service, the AGPL requires that its complete source
be offered to the people using it. It is: <https://github.com/maulanaarifpratama-dotcom/halalprogym>

Halal Pro Gym — Copyright (C) 2026 Maulana Arif Pratama.

---


openGym — Copyright (C) 2026 Duarte Santos.
openGym's own code is licensed under the **GNU AGPL v3.0** (see [LICENSE](LICENSE)).

## App store exception

As an additional permission under section 7 of the AGPL v3.0, the copyright holder permits
distribution of the openGym mobile application through app store platforms (such as the
Apple App Store and Google Play) whose terms of service would otherwise be incompatible
with the AGPL, provided the corresponding source code remains available under the AGPL at
the project repository. This permission applies to the distribution channel only and does
not otherwise limit the license.

## Exercise demo photos

Movement demo photos come from [**free-exercise-db**](https://github.com/yuhonas/free-exercise-db),
released under the **Unlicense** — a public-domain dedication, verified via GitHub's licence API
(`spdx_id: "Unlicense"`) rather than from a README badge. 873 exercises, each with a start-position
and an end-position photo.

Halal Pro Gym does not redistribute these files; it loads them from a **pinned commit** on jsDelivr,
so the mapping and the images can never drift apart. The catalogue-id to photo mapping is built by
`scripts/build-exercise-media.mjs` and committed as `frontend/src/lib/exercise-media.json`.

The Unlicense requires no attribution. It is given here anyway, because knowing where a dataset
came from is what lets the next person verify it.

## Food database

Two sources, two licences, and the split is deliberate.

### Packaged retail products — Open Food Facts

`frontend/src/lib/food-retail.js` is a **derived database** built from
[**Open Food Facts**](https://world.openfoodfacts.org) by `frontend/scripts/build-food-retail.mjs`.

Open Food Facts licences its work in three layers, and only two of them are used here:

| Layer | Licence | Used? |
| --- | --- | --- |
| the database | **ODbL 1.0** | yes — this derived database is therefore **also ODbL 1.0** |
| the contents (individual facts) | **DbCL 1.0** | yes |
| **product images** | CC BY-SA 3.0 | **no — never fetched at all** |

The images are excluded on purpose. CC BY-SA share-alike propagates into derivative works, and
this project has already paid for one licensed-media trap (see *Exercise data & media* below) by
rebuilding every movement demo from scratch. The build script never requests an image field, and
`frontend/src/lib/food-db.test.ts` fails if anyone adds one.

ODbL requires attribution. It is given in this file, in the header of the generated data file, in
the app's **Settings → About**, and on the food-search sheet itself where the data is actually
used. Those are load-bearing, not decorative.

Alcoholic and pork-derived products are dropped at build time. That filter is conservative and
best-effort — Open Food Facts categories are user-contributed and often absent — so it is not a
halal certification. The label on the package is what decides.

### Staple ingredients — USDA FoodData Central

`frontend/src/lib/food-usda.js` holds 59 hand-curated Indonesian staples (rice, tempeh, tofu, egg,
chicken, coconut milk, …) with values from
[**USDA FoodData Central**](https://fdc.nal.usda.gov), SR Legacy, released as **CC0 1.0** — public
domain, no conditions. Attribution is requested rather than required, and is given:

> U.S. Department of Agriculture, Agricultural Research Service, Beltsville Human Nutrition
> Research Center. *FoodData Central*, SR Legacy (2019-04-01).

Every row carries its `fdcId`, so any number can be checked against
`https://fdc.nal.usda.gov/food-details/<fdcId>/nutrients`. The **Indonesian names and household
serving sizes are ours**, not USDA's, and the original USDA description is kept on each row so an
imperfect match stays visible instead of being hidden.

The ids were picked by hand, not by search. USDA's own search returns *Ostrich, top loin* for
"beef top sirloin", and the top hit for "mackerel" is **salted** mackerel at 305 kcal/100 g —
roughly three times the fish an Indonesian recipe means.

### What is NOT here, and why

The **Tabel Komposisi Pangan Indonesia** (TKPI, Kementerian Kesehatan) is by far the best-fitting
source in substance — it exists precisely for Indonesian food. It is **not used**, because the
official Kemenkes repository publishes it under *"© Copyright 2022. All Rights Reserved by
Kemenkes"* with no open-licence statement of any kind. Redistributing it inside this app is not
permitted.

Cooked dishes (nasi uduk, rendang, gado-gado) are in neither source: they are not retail products
and not raw ingredients. Those are handled by the AI estimate path, which sends nothing to us and
distributes no food data at all — which is exactly why it was built.

## Movement illustrations — RepDB

`frontend/src/lib/exercise-illustrations.json` maps our catalogue ids to flat-style illustrations
from [**RepDB**](https://repdb.co), used under the **RepDB Free Tier License v1.0**.

> Exercise data by RepDB (repdb.co)

The licence permits personal **and commercial** use inside applications, requires visible
attribution, and forbids redistributing the dataset — including derived datasets. That last term
shapes how this repository works: only the **map** is committed here (our catalogue ids to their
filenames, which is our own work). The illustrations themselves are loaded from RepDB's own
distribution at a **pinned commit**, exactly as the exercise photos are. Bundling them into the
Android APK is in-app use and is permitted; the download cache lives outside the repository and is
git-ignored.

### Why illustrations win over photos

For any exercise covered by both sources, the illustration is used. That is not an aesthetic
preference — it is `DESIGN.md`'s own rule, under *Yang tidak boleh masuk*:

> Figur manusia berpakaian minim sebagai demo gerakan — soal aurat **dan** lisensi.

The free-exercise-db photos are photographs of real people, and some of them are bare-chested. The
rule existed from day one; what never happened was **checking it against the photos that actually
ship** — no metadata in free-exercise-db says "the model is shirtless", so no automatic rule could
ever have caught it. It surfaced only when eight photos were opened one at a time to verify that
the movements matched.

Exercises covered by neither source still get the MuscleMap muscle diagram.

## Body diagram geometry

The muscle outlines the body maps are drawn from (`frontend/src/lib/body-paths.js`) are derived
from [**MuscleMap**](https://github.com/melihcolpan/MuscleMap) by Melih Colpan, used under the
**MIT License** and reproduced below. MuscleMap ships its path data as Swift source rather than
`.svg` files; the paths were converted to a JSON module, its sub-group shapes were dropped, and
nothing else about the artwork was changed.

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Exercise data & media

openGym obtains both through
[**hasaneyldrm/exercises-dataset**](https://github.com/hasaneyldrm/exercises-dataset), which
licenses them differently. Neither is covered by openGym's AGPL license.

That dataset is itself a redistribution: the content originates from
[**ExerciseDB v1**](https://exercisedb.dev/) by **AscendAPI**. This is verifiable from openGym's
own data — the stored media filenames embed ExerciseDB's `exerciseId` (openGym's `0001` is
`0001-2gPfomN.jpg`; `2gPfomN` is ExerciseDB's id for "3/4 sit-up"), every metadata field matches,
and the instruction sentences are identical apart from stripped `Step:N ` prefixes. See
[issue #5](https://github.com/hasaneyldrm/exercises-dataset/issues/5) on that dataset.

### Metadata & instruction text

The exercise names, attributes and instructions (English in `frontend/src/lib/exercises-data.js`,
other languages in `frontend/src/instr/`, regenerated via `scripts/build-instructions.mjs`)
originate from ExerciseDB v1 and reach openGym through the dataset above, which distributes them
under the MIT license reproduced below. The translations into languages other than English are
openGym's own derivative work and are covered by openGym's AGPL.

```
MIT License

Copyright (c) 2026 Hasan Emir Yıldırım

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation and data files (the "Software"),
to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Images & animations — third-party, not MIT and not AGPL

The exercise thumbnails (180×180) and animations are **not** covered by the MIT license above and
**not** by openGym's AGPL. Their ownership is currently **unresolved**, and openGym states this
plainly rather than guessing:

- The upstream dataset attributes them to **© [Gym visual](https://gymvisual.com/)**, redistributed
  there with that rights holder's written permission — a permission granted to *that dataset* and
  **not transferable**.
- **ExerciseDB/AscendAPI** describes itself as "the original creator and owner" of this content and
  publishes its own [terms](https://exercisedb.io/faq), which permit self-hosting, bundling and
  commercial display, while prohibiting redistribution of the raw dataset or media as a standalone
  or competing content package.

These two claims contradict each other. A clarification has been requested from AscendAPI; this
notice will be updated once the provenance is settled.

**Until then, treat the media as third-party content licensed to neither openGym nor to you.**

**openGym does not redistribute it.** It is not in this repository, not in its history, and not in
the published container images or the Android APK. A self-hosted instance downloads it from the
upstream source on first `docker compose up`; the mobile and demo builds load it from a CDN at
runtime.

If you want to reuse the media — in openGym or anywhere else, commercially or not — **clear it with
the rights holder first**, and keep any attribution that accompanies it intact.

Brazilian Portuguese exercise instructions under
`scripts/instruction-sources/pt-BR.json` and exercise names under
`scripts/exercise-name-sources/pt-BR.json` are original translations of that
English source produced with OpenAI Codex and Anthropic Claude Code
language-model assistance. They are not copied from a separate Portuguese
dataset. Their review status and translation policy are documented alongside
the source files.

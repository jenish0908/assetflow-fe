# Design notes

**Subject.** IT asset tracking. **People:** IT staff and managers who act on
equipment every day, and employees checking what they hold. **The job:** know
where every device is, and act on it in two clicks.

## The idea: the asset label

Every company laptop has a printed label stuck on it: a tag number and a
barcode, usually yellow or silver. That label is the most recognisable object
in this domain, so it is the interface's signature:

- everywhere an asset is mentioned, its tag appears as a small printed label
  (with the punched hole), so tags are scannable in a list;
- on the asset page and the sign-in page it appears full size, with a real
  Code 39 barcode of the tag.

Everything else stays quiet so the labels stand out.

## Tokens

| token | value | use |
|---|---|---|
| ink | `#16233F` | text, sidebar, primary buttons |
| canvas | `#F4F6F8` | page background |
| surface | `#FFFFFF` | tables and panels |
| line | `#D9DEE6` | borders and dividers |
| label yellow | `#F5C518` | asset labels and the current-page marker only |
| available / allocated / maintenance / retired | `#1E7F4F` / `#2952CC` / `#B25E00` / `#6B7280` | status colour, always paired with a word |

Navy and yellow come from equipment labels and inspection tags. Yellow is
reserved: it means "this is a physical thing" (or "you are here").

**Type.** Barlow for the interface. Barlow Semi Condensed, bold with tabular
numbers, for headings, tag codes and figures. Barlow descends from highway and
industrial signage, and the condensed width reads like stamped label codes.
Scale: major third from a 15 px base.

## Layout

Navy sidebar, tables first, hairline dividers, small radii, almost no shadows
(only the labels cast one, because they are objects). The overview uses one
**fleet bar** (where every device is, by status) and a quiet strip of figures
instead of a grid of identical stat cards. The allocation history is a
timeline because it really is a sequence.

## What was checked and changed

Reviewing screenshots of every page (desktop and phone) led to these fixes:

- On phones the whole page scrolled sideways. A plain `1fr` grid track grows
  to fit wide content, so it became `minmax(0, 1fr)`. Secondary table columns
  hide on narrow screens. An end-to-end test now fails on any sideways scroll.
- A width-100% barcode inside an `auto` grid column inflated the column and
  pushed the asset details far right. The label column is now capped.
- The notification feed read "D-402 was allocated for Hannah Becker" and was
  ordered by job ID. It now reads "D-402 allocated to Hannah Becker" (or
  "…allocated to you" for the recipient) and is ordered by time.
- The assistant said "held by user #3". The backend now returns the holder's
  name, so it says "with Priya Shah".
- Middle-dot meta strings ("4 days ago · attempt 2") were replaced with plain
  wording.

## Quality floor

Visible focus everywhere (yellow on the navy sidebar), labelled form controls,
native `<dialog>` modals, status never conveyed by colour alone,
`prefers-reduced-motion` respected (the only orchestrated motion is the label
dropping in on the sign-in page), and an axe-core audit of every page in CI.

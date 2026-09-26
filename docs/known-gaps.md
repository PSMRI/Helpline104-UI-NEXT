# Known gaps against the legacy 104 app

Deliberate or deferred differences between Helpline104-UI-NEXT and the legacy `PSMRI/Helpline104-UI`
app. Each entry says what legacy does, what we do, and why it is not being closed right now.

## Supervisor

### Diseases Summary: no staging buffer for batch save (2026-09-26)

**Legacy.** Create Disease Summary has an Add step: the supervisor fills the fields, presses Add, and
the entry goes into a buffer table under the form (name, summary, medical advice, delete icon). The
supervisor can add several diseases this way and then press Save once, which posts the whole buffer
as one array to `diseaseController/saveDisease`. Save is hidden until the buffer has at least one row,
and a duplicate name inside the buffer is refused.

**Ours.** No buffer. Save posts the current form as a one-element array to the same endpoint, one
disease per Save. The delete icon on legacy's buffer removes an unsaved row; it is not a catalogue
delete, and neither app hard-deletes a saved disease (both toggle `deleted` via `deleteDisease`).

**Status.** Not building it now. The wire contract, field set, `$`-joined content encoding and the
agent-side viewer are identical, so records saved by either screen render the same. The gap is
workflow only: batch entry of several diseases in one Save.

### Diseases Summary: `deleteDisease` payload shape differs from legacy (2026-09-26)

**Legacy.** The activate/deactivate toggle posts the catalogue row after its content fields have
been decoded for display (leading `$` stripped, `$` turned into newlines).

**Ours.** The toggle posts the raw row as fetched, content still `$`-encoded.

**Why it does not matter.** Verified from the `PSMRI/Helpline104-API` source on GitHub (`main`):
`DiseaseServiceImpl.deleteDisease` reads only `diseasesummaryID` and `deleted` from the body, and the
repository statement is `UPDATE Disease set deleted = :deleted where diseasesummaryID = :id`. Every
other field in the payload is discarded, so neither shape can corrupt stored content. Content changes
only through `saveDisease` and `updateDisease`, and both apps send the same `$`-encoded shape there.

**Not yet verified against the deployed UAT build**, because the 104-api gateway was down on
2026-09-26. Live check when it returns: create a record with content in several fields, read it back,
toggle it twice with our payload, read it back, and diff. Expect byte-identical content with only
`deleted` flipping.

## Closure (CO): institute lookups without loading or empty states

The CO External Referral fields on the closure step fetch institute types on reveal and institute
names on type change (`call/hao/steps/closure-step.component.ts`). Neither has a loading or empty
state and both swallow errors; the names field renders as an empty multi-select with no placeholder.
Left as is on 2026-09-26: the file is owned by fix/hao-closure-robustness (#131), but no open PR is
CO-specific, so the change waits for whoever picks up CO closure work. Apply the same pattern used for
transfer services and campaign skills in that file.

Closed on 2026-09-26 and no longer gaps: districts (both forms), blocks and villages on registration
(#130); healthcare worker types (#130); transfer services, campaign skills and appointment facilities
(#131); registration state list filtered and pre-selected to the role's state as legacy does (#130).

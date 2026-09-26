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

## Registration and closure: on-demand lookups without loading or empty states

Audit of 2026-09-26. Reference pattern: villages (`noVillages` signal, "No villages found for this
block." under the select) and, since d42b01c, healthcare worker types (loading message with the
select disabled, "No healthcare worker types configured." on an empty 200, inline error with Retry).
The lookups below still lack one or both states. Branch is where the owning file is being changed.

| Lookup | Screen | Owning file | Loading | Empty | Error | Branch / PR |
|---|---|---|---|---|---|---|
| Districts (register form) | Registration, address | `call/beneficiary/beneficiary-registration.component.ts` | no | no | swallowed | fix/registration-flow-bugs, #130 |
| Districts (search form) | Registration, search filter | same | no | no | swallowed | fix/registration-flow-bugs, #130 |
| Blocks / taluks | Registration, address | same | no | no | swallowed | fix/registration-flow-bugs, #130 |
| Villages | Registration, address | same | no | yes | toast | fix/registration-flow-bugs, #130 |
| Transfer services (H10) | Closure, Transfer Call | `call/hao/steps/closure-step.component.ts` | Retry button only, select never disabled | no, placeholder reads "Select none" | inline + Retry | fix/hao-closure-robustness, #131 |
| Campaign skills | Closure, after picking a transfer service | same | no | no, whole field hidden while empty | swallowed | fix/hao-closure-robustness, #131 |
| Institute types (CO) | Closure, External Referral = Yes | same | no | no | swallowed | fix/hao-closure-robustness, #131 |
| Institute names (CO) | Closure, after picking an institute type | same | no | no, empty multi-select box with no placeholder | swallowed | fix/hao-closure-robustness, #131 |
| Appointment facilities | Closure, Schedule Appointment dialog, after picking a block | `call/schedule-appointment/schedule-appointment.component.ts` | no | no | inline banner, no Retry | fix/hao-closure-robustness, #131 |

Districts and blocks also swallow their errors entirely, which is worse than either missing state.
Not being closed now; fix in the order districts, blocks, villages (same file, villages pattern),
then transfer services, then the CO and appointment lookups.

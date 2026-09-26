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

## Deferred findings from the pre-merge review of 2026-09-26

Ranked list carried over from the adversarial review of PRs #129 to #132, numbering as in that
review (items 1 to 4 were fixed before merge). Not fixed in this round; recorded for the next one.
**Items 7 and 10 are the two most likely to matter.**

5. **Cancel on the Health Advisory prompt drops the just-created beneficiary binding.** Legacy's "No"
   keeps the beneficiary bound and only disables closure; ours clears it, so the agent must find the
   record again in history, which is the slow 25 to 55 second lookup. Our spec codifies the new
   behaviour. Product decision needed. Verify: register, Cancel on the prompt, check the summary bar
   and the closure step.
6. **Sanitizer plus "server fault" widening can hide business messages.** The `/exception/i` and
   `/\bjava\./i` patterns rewrite any envelope containing those tokens, and the supervisor and
   emergency-contacts helpers now treat every statusCode of 5000 or more as a server fault, including
   the backend's "No data found" style replies. Verify with a 5000 "No data found" envelope on
   getEmergencyContacts.
7. **MOST LIKELY TO MATTER. Failure envelopes make the new empty states unreachable.** The HAO
   service now throws on any 5000 envelope, so a backend that reports "no data" as 5000 with null data
   yields error plus Retry forever instead of the "No transfer services" or "No skills" message.
   Today's "No active skill found" from CZentrix is exactly this shape. Verify on UAT closure as any
   agent: pick a transfer service and watch the Skill field.
8. **Update payload still short of legacy.** Missing `statusID`, `registeredServiceID` and
   `preferredLangID`; empty strings where legacy sends null on `pinCode` and `addressLine1`;
   `benRelationshipID` re-stamped only on the first phone map. Verify against a captured legacy
   update body.
9. **`cascadeLoadAddress` on Modify is unguarded and swallows errors**, so a failed district fetch
   leaves a blank select holding a hidden id and Modify still proceeds. Verify by failing one district
   request while opening a record.
10. **MOST LIKELY TO MATTER. Encrypted login password sits in sessionStorage** to power the CTI-key
    Retry. The passphrase is static in the bundle, so it is reversible with the JS. Legacy stored no
    password. Which PR introduced the storage was not verified; the Retry in #132 depends on it.
    Verify: log in, open DevTools, Application, Session Storage, look for `ctiLoginPassword`.
11. **Emergency flag effect clears the call type on every true-to-false flip**, including call store
    resets, and overrides a referral-locked call type when it flips true. Verify by booking a
    referral then toggling emergency in registration.
12. **Disease-summary duplicate guard is bypassed after a failed load**, since it checks only the
    loaded page and Create stays open. Verify by failing the list load, then creating an existing
    name.
13. **loadStates error still swallowed**, and the healthcare worker type is neither required nor part
    of the submit guard, so a form can submit `healthCareWorkerID: null` for an agent who ticked Yes
    while the list was loading. Verify: 500 on `m/role/state`; and tick Yes then submit while the
    types are loading.
14. **Report timeout halved to 60s** in #131 without a note; wide ranges that used to finish will now
    time out. Verify with a month-wide report on UAT.
15. Smaller: the "invalid file" message is the helper text repeated in red with no "rejected"
    wording; a page-size pick permanently overrides later `pageSize` input changes; hard-coded
    English screen-reader text in the pager; an orphaned `reports.callType.dialDeferred` key in three
    locales; iframe unmount on auth routes may fire the bogus disconnect if navigated mid-call.
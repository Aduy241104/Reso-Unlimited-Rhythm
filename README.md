# Reso — Unlimited Rhythm

## Backend setup

```powershell
cd Backend
npm install
npm start
```

The Backend `postinstall` script detects the current Node platform and architecture, downloads the matching official Chromaprint `fpcalc` package, installs it under `Backend/tools/chromaprint/`, and verifies `fpcalc -version`. A valid binary is reused and is not downloaded again. `FPCALC_PATH` is optional and can override the bundled binary when a deployment provides its own executable.

Fingerprint setup details, supported platforms, automatic moderation, and troubleshooting are documented in [`Backend/docs/audio-fingerprinting.md`](Backend/docs/audio-fingerprinting.md).

When an artist submits a track, the backend validates the copyright declaration and evidence. Exact/high-confidence audio matches can be rejected automatically; a clean fingerprint remains pending for Admin review. Admin approval is server-gated by a review session that records the opened metadata, copyright declaration, audio listening, fingerprint result, and each required evidence document. `FINGERPRINT_AUTO_APPROVE` is kept only for backward-compatible configuration and no longer bypasses this gate.

Copyright declarations use one primary type (`original`, `cover`, or `remix`) plus optional secondary flags for sample and third-party beat usage. Remix, sample, and beat usage require uploaded evidence; URL references are kept only as supporting metadata. ISRC/ISWC are optional and normalized by the backend.

After a completed fingerprint, the backend performs a throttled, cached MusicBrainz lookup. It stores both the artist declaration and a normalized external result (`matched`, `possible_match`, `not_found`, or `failed`) for Admin comparison. MusicBrainz is metadata reference only: it never proves legal ownership and never auto-rejects a track by itself. Set `MUSICBRAINZ_USER_AGENT` to a contactable User-Agent before production use.

Track deletion keeps moderation audit history but separates fingerprint data by lifecycle. An unsubmitted draft removes its operational fingerprint, match, registry, and audio assets; a copyright/duplicate violation keeps its source audio for investigation and creates retained hash/fingerprint enforcement evidence; an approved track keeps historical metadata while its audio can be cleaned and does not block a new upload. Run the lifecycle audit in dry-run mode before cleanup:

```powershell
cd Backend
npm run fingerprint:lifecycle
npm run fingerprint:lifecycle -- --apply
```

If this is an existing database that was created before soft-delete or case-insensitive title-key support, repair the Track unique indexes once. The first command is read-only; apply only when it reports no active title/version or normalized-title duplicates:

```powershell
cd Backend
npm run migrate:track-indexes
npm run migrate:track-indexes -- --apply
```

The upload endpoint accepts an optional `X-Upload-Operation-Id`. Audio/image/lyrics assets use content-addressed public IDs under that operation, so a retry can reuse the exact Cloudinary asset. The server rolls back newly created assets when a multipart upload fails and never enables blind overwrite.

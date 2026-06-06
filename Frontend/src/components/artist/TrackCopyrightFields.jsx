import { usesThirdPartyRights } from "../../utils/trackWorkflow";

const TrackCopyrightFields = ({ value, onChange, disabled = false }) => {
  const copyright = value || {};
  const thirdParty = usesThirdPartyRights(copyright);

  const updateField = (field, nextValue) => {
    onChange({
      ...copyright,
      [field]: nextValue,
    });
  };

  const updateRightsType = (field) => {
    const nextValue = !copyright[field];

    if (field === "isOriginal" && nextValue) {
      onChange({
        ...copyright,
        isOriginal: true,
        isCover: false,
        isRemix: false,
        usesSample: false,
        usesLicensedBeat: false,
      });
      return;
    }

    onChange({
      ...copyright,
      [field]: nextValue,
      isOriginal: field === "isOriginal" ? nextValue : false,
    });
  };

  const licenseText = Array.isArray(copyright.licenseDocumentUrls)
    ? copyright.licenseDocumentUrls.join("\n")
    : "";

  return (
    <div className="space-y-4 rounded-md border border-neutral-200 bg-[#fcfaf7] p-4">
      <div>
        <p className="text-sm font-medium text-[#241b15]">Copyright & rights</p>
        <p className="mt-1 text-xs text-neutral-600">
          Required before you submit the track for admin approval.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Copyright owner *
          </label>
          <input
            type="text"
            value={copyright.copyrightOwner || ""}
            onChange={(event) => updateField("copyrightOwner", event.target.value)}
            disabled={disabled}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Recording owner *
          </label>
          <input
            type="text"
            value={copyright.recordingOwner || ""}
            onChange={(event) => updateField("recordingOwner", event.target.value)}
            disabled={disabled}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["composer", "Composer"],
          ["lyricist", "Lyricist"],
          ["producer", "Producer"],
        ].map(([field, label]) => (
          <div key={field}>
            <label className="block text-sm font-medium text-[#241b15]">{label}</label>
            <input
              type="text"
              value={copyright[field] || ""}
              onChange={(event) => updateField(field, event.target.value)}
              disabled={disabled}
              className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-neutral-700">
        {[
          ["isOriginal", "Original work"],
          ["isCover", "Cover"],
          ["isRemix", "Remix"],
          ["usesSample", "Uses sample"],
          ["usesLicensedBeat", "Licensed beat"],
        ].map(([field, label]) => (
          <label key={field} className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(copyright[field])}
              onChange={() => updateRightsType(field)}
              disabled={disabled}
              className="h-4 w-4 rounded border-neutral-300 text-[#8b5e3c]"
            />
            {label}
          </label>
        ))}
      </div>

      {thirdParty ? (
        <div className="space-y-4 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Third-party rights documentation
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#241b15]">
                Original track title *
              </label>
              <input
                type="text"
                value={copyright.originalTrackTitle || ""}
                onChange={(event) => updateField("originalTrackTitle", event.target.value)}
                disabled={disabled}
                className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#241b15]">
                Original artist name *
              </label>
              <input
                type="text"
                value={copyright.originalArtistName || ""}
                onChange={(event) => updateField("originalArtistName", event.target.value)}
                disabled={disabled}
                className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#241b15]">
              License document URLs * (one per line)
            </label>
            <textarea
              rows={3}
              value={licenseText}
              onChange={(event) =>
                updateField(
                  "licenseDocumentUrls",
                  event.target.value
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean)
                )
              }
              disabled={disabled}
              placeholder="https://..."
              className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-[#241b15]">Copyright note</label>
        <textarea
          rows={2}
          value={copyright.copyrightNote || ""}
          onChange={(event) => updateField("copyrightNote", event.target.value)}
          disabled={disabled}
          className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
        />
      </div>

      <label className="inline-flex items-start gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={Boolean(copyright.declarationAccepted)}
          onChange={(event) => updateField("declarationAccepted", event.target.checked)}
          disabled={disabled}
          className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#8b5e3c]"
        />
        <span>
          I declare that I own or have obtained all necessary rights to distribute this
          track, and the information provided is accurate.
        </span>
      </label>
    </div>
  );
};

export default TrackCopyrightFields;

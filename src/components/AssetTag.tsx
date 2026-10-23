import { Link } from "react-router-dom";

import { code39 } from "../lib/code39";

/** The small printed label used wherever an asset is mentioned. */
export function AssetTag({ tag, to }: { tag: string; to?: string }) {
  if (to) {
    return (
      <Link className="tag" to={to} aria-label={`Asset ${tag}`}>
        {tag}
      </Link>
    );
  }
  return <span className="tag">{tag}</span>;
}

/** A real Code 39 barcode for the tag. */
export function Barcode({ value, height = 42 }: { value: string; height?: number }) {
  const { bars, width } = code39(value);
  return (
    <svg
      className="label-barcode"
      viewBox={`0 0 ${width} 10`}
      preserveAspectRatio="none"
      style={{ height }}
      role="img"
      aria-label={`Barcode for ${value}`}
    >
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={0} width={b.width} height={10} fill="currentColor" />
      ))}
    </svg>
  );
}

/** The large label: the identity of an asset, as it is printed on the device. */
export function AssetLabel({ tag, name, owner = "Property of AssetFlow" }: { tag: string; name?: string; owner?: string }) {
  return (
    <div className="label-card">
      <span className="label-owner">{owner}</span>
      <span className="label-code">{tag}</span>
      <Barcode value={tag} />
      {name && <span className="label-name">{name}</span>}
    </div>
  );
}

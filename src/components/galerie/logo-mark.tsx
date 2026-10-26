import { logoById, resolveLogoColor, type LogoProposal, type LogoShape } from "@/lib/logos";

/**
 * Rendu HTML d'une marque, à partir de sa description de formes.
 *
 * `instance` distingue les identifiants de dégradés lorsque plusieurs marques
 * coexistent sur la même page : sans cela, elles se voleraient leurs couleurs.
 */
export function LogoMark({
  id,
  accent,
  size = 72,
  instance,
}: {
  id: string;
  accent: string;
  size?: number;
  instance?: string;
}) {
  const logo = logoById(id);
  if (!logo) return null;

  const instanceId = instance ?? `logo-${logo.id}`;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`Logo ${logo.name}`}
      style={{ display: "block" }}
    >
      <Defs logo={logo} instanceId={instanceId} />
      {logo.shapes.map((shape, index) => (
        <Shape key={index} shape={shape} accent={accent} instanceId={instanceId} />
      ))}
    </svg>
  );
}

function Defs({ logo, instanceId }: { logo: LogoProposal; instanceId: string }) {
  if (!logo.defs?.length) return null;
  return (
    <defs>
      {logo.defs.map((gradient) => (
        <linearGradient
          key={gradient.id}
          id={`${instanceId}-${gradient.id}`}
          gradientUnits="userSpaceOnUse"
          x1={gradient.x1 ?? 0}
          y1={gradient.y1 ?? 0}
          x2={gradient.x2 ?? 100}
          y2={gradient.y2 ?? 100}
        >
          <stop offset="0%" stopColor={gradient.from} />
          <stop offset="100%" stopColor={gradient.to} />
        </linearGradient>
      ))}
    </defs>
  );
}

function Shape({
  shape,
  accent,
  instanceId,
}: {
  shape: LogoShape;
  accent: string;
  instanceId: string;
}) {
  const fill = resolveLogoColor(shape.fill, accent, instanceId);
  const stroke = resolveLogoColor(shape.stroke, accent, instanceId);
  const common = {
    fill,
    stroke,
    strokeWidth: shape.strokeWidth ?? 0,
    opacity: shape.opacity ?? 1,
  };

  if (shape.kind === "rect") {
    return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx ?? 0} {...common} />;
  }

  if (shape.kind === "circle") {
    return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />;
  }

  if (shape.kind === "ellipse") {
    return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />;
  }

  if (shape.kind === "polygon") {
    return <polygon points={shape.points} {...common} />;
  }

  if (shape.kind === "path") {
    return (
      <path
        d={shape.d}
        {...common}
        strokeLinecap={shape.linecap}
        strokeLinejoin={shape.linejoin}
      />
    );
  }

  return (
    <text
      x={shape.x}
      y={shape.y}
      fontSize={shape.size}
      fill={resolveLogoColor(shape.fill, accent, instanceId, "#1A1815")}
      opacity={shape.opacity ?? 1}
      fontWeight={shape.bold ? 700 : 400}
      fontStyle={shape.italic ? "italic" : undefined}
      fontFamily={
        shape.mono
          ? 'ui-monospace, "Cascadia Mono", Consolas, monospace'
          : shape.serif
            ? 'Georgia, "Times New Roman", serif'
            : 'ui-sans-serif, system-ui, "Segoe UI", Helvetica, Arial, sans-serif'
      }
      textAnchor={shape.anchor ?? "start"}
      letterSpacing={shape.letterSpacing ?? 0}
    >
      {shape.content}
    </text>
  );
}

import {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Svg,
  Text as SvgText,
} from "@react-pdf/renderer";
import { logoById, resolveLogoColor, type LogoShape } from "@/lib/logos";

/**
 * Rendu PDF d'une marque, à partir de la même description de formes que
 * l'aperçu HTML : le logo imprimé est rigoureusement celui choisi dans la
 * galerie, et reste vectoriel donc net à l'impression.
 */
export function PdfLogoMark({
  id,
  accent,
  size,
}: {
  id: string;
  accent: string;
  size: number;
}) {
  const logo = logoById(id);
  if (!logo) return null;

  const instanceId = `pdf-${logo.id}`;

  return (
    <Svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
      {logo.defs && logo.defs.length > 0 && (
        <Defs>
          {logo.defs.map((gradient) => (
            <LinearGradient
              key={gradient.id}
              id={`${instanceId}-${gradient.id}`}
              gradientUnits="userSpaceOnUse"
              x1={gradient.x1 ?? 0}
              y1={gradient.y1 ?? 0}
              x2={gradient.x2 ?? 100}
              y2={gradient.y2 ?? 100}
            >
              <Stop offset="0" stopColor={gradient.from} />
              <Stop offset="1" stopColor={gradient.to} />
            </LinearGradient>
          ))}
        </Defs>
      )}

      {logo.shapes.map((shape, index) => (
        <Shape key={index} shape={shape} accent={accent} instanceId={instanceId} />
      ))}
    </Svg>
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
  const strokeProps =
    stroke === "none"
      ? {}
      : { stroke, strokeWidth: shape.strokeWidth ?? 0 };
  const fillProp = fill === "none" ? {} : { fill };
  const opacity = shape.opacity ?? 1;

  if (shape.kind === "rect") {
    return (
      <Rect
        x={shape.x}
        y={shape.y}
        width={shape.w}
        height={shape.h}
        rx={shape.rx ?? 0}
        ry={shape.rx ?? 0}
        opacity={opacity}
        {...fillProp}
        {...strokeProps}
      />
    );
  }

  if (shape.kind === "circle") {
    return <Circle cx={shape.cx} cy={shape.cy} r={shape.r} opacity={opacity} {...fillProp} {...strokeProps} />;
  }

  if (shape.kind === "ellipse") {
    return (
      <Ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} opacity={opacity} {...fillProp} {...strokeProps} />
    );
  }

  if (shape.kind === "polygon") {
    return <Polygon points={shape.points} opacity={opacity} {...fillProp} {...strokeProps} />;
  }

  if (shape.kind === "path") {
    return (
      <Path
        d={shape.d}
        opacity={opacity}
        strokeLinecap={shape.linecap}
        strokeLinejoin={shape.linejoin}
        {...fillProp}
        {...strokeProps}
      />
    );
  }

  return (
    <SvgText
      x={shape.x}
      y={shape.y}
      fill={resolveLogoColor(shape.fill, accent, instanceId, "#1A1815")}
      opacity={opacity}
      textAnchor={shape.anchor ?? "start"}
      // La police et le corps passent par le style : les types du moteur PDF
      // ne les acceptent pas en attributs sur un texte SVG.
      style={{ fontFamily: pdfFont(shape), fontSize: shape.size }}
    >
      {shape.content}
    </SvgText>
  );
}

/** Polices standard du PDF : aucun fichier à embarquer. */
function pdfFont(shape: Extract<LogoShape, { kind: "text" }>): string {
  if (shape.mono) return shape.bold ? "Courier-Bold" : "Courier";
  if (shape.serif) {
    if (shape.italic) return shape.bold ? "Times-BoldItalic" : "Times-Italic";
    return shape.bold ? "Times-Bold" : "Times-Roman";
  }
  if (shape.italic) return shape.bold ? "Helvetica-BoldOblique" : "Helvetica-Oblique";
  return shape.bold ? "Helvetica-Bold" : "Helvetica";
}

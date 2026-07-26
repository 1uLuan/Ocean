import type { JSX } from "solid-js";
import { createContext, Component } from "solid-js";

export interface IconProps extends JSX.HTMLAttributes<SVGSVGElement> {
  color?: string;
  size?: string | number;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  mirrored?: boolean;
}

export type Icon = Component<IconProps>;

export type IconContextProps = Required<
  Pick<IconProps, "color" | "size" | "weight" | "mirrored">
> &
JSX.HTMLAttributes<SVGSVGElement>;

export const IconContext = createContext<IconContextProps>({
  color: "currentColor",
  size: "1em",
  weight: "regular",
  mirrored: false,
});

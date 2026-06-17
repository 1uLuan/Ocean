import { createContext } from "solid-js";
export const IconContext = createContext({
    color: "currentColor",
    size: "1em",
    weight: "regular",
    mirrored: false,
});

// A stand-in for Herdr's "gpui-kit" module: the view class and the plain elements.
import { element } from "./elements.js";

export class View {}
export const div = () => element("div");
export const svg = (path) => element("svg", path);
export const image = (path) => element("image", path);

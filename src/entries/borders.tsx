// One composition alone, for working on it: node build.mjs borders
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/borders.json";
import { Borders, bordersLength } from "../Borders";
import type { BordersProps } from "../props";

registerRoot(() => <Composition id="borders" component={Borders} width={1080} height={1920} fps={30} durationInFrames={bordersLength()} defaultProps={sample as unknown as BordersProps} />);

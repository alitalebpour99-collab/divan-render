// One composition alone, for working on it: node build.mjs power
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/power.json";
import { Power, powerDuration } from "../Power";
import type { PowerProps } from "../props";

registerRoot(() => (
  <Composition id="power" component={Power} width={1080} height={1920} fps={30} durationInFrames={1420} defaultProps={sample as unknown as PowerProps} calculateMetadata={({ props }) => ({ durationInFrames: powerDuration(props) })} />
));

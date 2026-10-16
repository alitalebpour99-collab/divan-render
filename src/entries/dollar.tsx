// One composition alone, for working on it: node build.mjs dollar
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/dollar.json";
import { Dollar, dollarDuration } from "../Dollar";
import type { DollarProps } from "../props";

registerRoot(() => (
  <Composition id="dollar" component={Dollar} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={sample as unknown as DollarProps} calculateMetadata={({ props }) => ({ durationInFrames: dollarDuration(props) })} />
));

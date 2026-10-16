// One composition alone, for working on it: node build.mjs nuclear
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/nuclear.json";
import { Nuclear, nuclearDuration } from "../Nuclear";
import type { NuclearProps } from "../props";

registerRoot(() => (
  <Composition id="nuclear" component={Nuclear} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={sample as unknown as NuclearProps} calculateMetadata={({ props }) => ({ durationInFrames: nuclearDuration(props) })} />
));

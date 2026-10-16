// One composition alone, for working on it: node build.mjs arsenal
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/arsenal.json";
import { Arsenal, arsenalDuration } from "../Arsenal";
import type { ArsenalProps } from "../props";

registerRoot(() => (
  <Composition id="arsenal" component={Arsenal} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={sample as unknown as ArsenalProps} calculateMetadata={({ props }) => ({ durationInFrames: arsenalDuration(props) })} />
));

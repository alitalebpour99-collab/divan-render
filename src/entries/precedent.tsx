// One composition alone, for working on it: node build.mjs precedent
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/precedent.json";
import { Precedent, precedentDuration } from "../Precedent";
import type { PrecedentProps } from "../props";

registerRoot(() => (
  <Composition id="precedent" component={Precedent} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={sample as unknown as PrecedentProps} calculateMetadata={({ props }) => ({ durationInFrames: precedentDuration(props) })} />
));

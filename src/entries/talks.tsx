// One composition alone, for working on it: node build.mjs talks
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/talks.json";
import { Talks, talksDuration } from "../Talks";
import type { TalksProps } from "../props";

registerRoot(() => (
  <Composition id="talks" component={Talks} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={sample as unknown as TalksProps} calculateMetadata={({ props }) => ({ durationInFrames: talksDuration(props) })} />
));

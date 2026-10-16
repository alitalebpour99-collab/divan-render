// One composition alone, for working on it: node build.mjs dilemma
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/dilemma.json";
import { Dilemma, dilemmaDuration } from "../Dilemma";
import type { DilemmaProps } from "../props";

registerRoot(() => (
  <Composition id="dilemma" component={Dilemma} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={sample as unknown as DilemmaProps} calculateMetadata={({ props }) => ({ durationInFrames: dilemmaDuration(props) })} />
));

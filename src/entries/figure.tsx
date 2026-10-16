// One composition alone, for working on it: node build.mjs figure
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/figure.json";
import { Figure, figureDuration } from "../Figure";
import type { FigureProps } from "../props";

registerRoot(() => (
  <Composition id="figure" component={Figure} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={sample as unknown as FigureProps} calculateMetadata={({ props }) => ({ durationInFrames: figureDuration(props) })} />
));

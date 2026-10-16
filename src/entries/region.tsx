// One composition alone, for working on it: node build.mjs region
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/region.json";
import { Region, regionDuration } from "../Region";
import type { RegionProps } from "../props";

registerRoot(() => (
  <Composition id="region" component={Region} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={sample as unknown as RegionProps} calculateMetadata={({ props }) => ({ durationInFrames: regionDuration(props) })} />
));

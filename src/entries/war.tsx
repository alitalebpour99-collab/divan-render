// One composition alone, for working on it: node build.mjs war
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/war.json";
import { WarReplay, warDuration } from "../WarReplay";
import type { WarProps } from "../props";

registerRoot(() => <Composition id="war" component={WarReplay} width={1080} height={1920} fps={30} durationInFrames={warDuration()} defaultProps={sample as unknown as WarProps} />);

// One composition alone, for working on it: node build.mjs cover
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/seat.cover.json";
import { Cover } from "../Cover";
import type { CoverProps } from "../props";

registerRoot(() => <Composition id="cover" component={Cover} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={sample as unknown as CoverProps} />);

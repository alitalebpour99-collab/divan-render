// One composition alone, for working on it: node build.mjs story
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/story.json";
import { Story, storyDuration } from "../Story";
import type { StoryProps } from "../props";

registerRoot(() => <Composition id="story" component={Story} width={1080} height={1920} fps={30} durationInFrames={storyDuration()} defaultProps={sample as unknown as StoryProps} />);

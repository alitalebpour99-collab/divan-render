import React from "react";
import { Composition } from "remotion";
import arsenalSample from "../samples/arsenal.json";
import bordersSample from "../samples/borders.json";
import dollarSample from "../samples/dollar.json";
import figureSample from "../samples/figure.json";
import nuclearSample from "../samples/nuclear.json";
import dilemmaSample from "../samples/dilemma.json";
import precedentSample from "../samples/precedent.json";
import regionSample from "../samples/region.json";
import coverSample from "../samples/seat.cover.json";
import seatSample from "../samples/seat.json";
import talksSample from "../samples/talks.json";
import warSample from "../samples/war.json";
import { Arsenal, arsenalDuration } from "./Arsenal";
import { Borders, bordersLength } from "./Borders";
import { Cover } from "./Cover";
import { Dilemma, dilemmaDuration } from "./Dilemma";
import { Dollar, dollarDuration } from "./Dollar";
import { Figure, figureDuration } from "./Figure";
import { Nuclear, nuclearDuration } from "./Nuclear";
import { Precedent, precedentDuration } from "./Precedent";
import { Region, regionDuration } from "./Region";
// the default content must hold no optional key: a Reel's props that leave one out would take the sample's value
import storySample from "../samples/story.json";
import { Seat, seatDuration } from "./Seat";
import { Story, storyDuration } from "./Story";
import { Talks, talksDuration } from "./Talks";
import { WarReplay, warDuration } from "./WarReplay";
import type { ArsenalProps, BordersProps, CoverProps, DilemmaProps, DollarProps, FigureProps, NuclearProps, PrecedentProps, RegionProps, SeatProps, StoryProps, TalksProps, WarProps } from "./props";

// One composition per format of the page (the id is the format's id in
// lib/social/formats.ts of the site), all in the Reel frame, plus the still
// tile for the profile grid. The samples are only what the studio shows when
// no content is passed; a render always gets its content from the site.
const frame = { width: 1080, height: 1920, fps: 30 };
const as = <T,>(sample: unknown) => sample as T;

export const Root: React.FC = () => (
  <>
    <Composition id="dilemma" component={Dilemma} {...frame} durationInFrames={900} defaultProps={as<DilemmaProps>(dilemmaSample)} calculateMetadata={({ props }) => ({ durationInFrames: dilemmaDuration(props) })} />
    <Composition id="seat" component={Seat} {...frame} durationInFrames={900} defaultProps={as<SeatProps>(seatSample)} calculateMetadata={({ props }) => ({ durationInFrames: seatDuration(props) })} />
    <Composition id="region" component={Region} {...frame} durationInFrames={600} defaultProps={as<RegionProps>(regionSample)} calculateMetadata={({ props }) => ({ durationInFrames: regionDuration(props) })} />
    <Composition id="precedent" component={Precedent} {...frame} durationInFrames={900} defaultProps={as<PrecedentProps>(precedentSample)} calculateMetadata={({ props }) => ({ durationInFrames: precedentDuration(props) })} />
    <Composition id="talks" component={Talks} {...frame} durationInFrames={900} defaultProps={as<TalksProps>(talksSample)} calculateMetadata={({ props }) => ({ durationInFrames: talksDuration(props) })} />
    <Composition id="war" component={WarReplay} {...frame} durationInFrames={warDuration()} defaultProps={as<WarProps>(warSample)} />
    <Composition id="borders" component={Borders} {...frame} durationInFrames={bordersLength()} defaultProps={as<BordersProps>(bordersSample)} />
    <Composition id="arsenal" component={Arsenal} {...frame} durationInFrames={750} defaultProps={as<ArsenalProps>(arsenalSample)} calculateMetadata={({ props }) => ({ durationInFrames: arsenalDuration(props) })} />
    <Composition id="dollar" component={Dollar} {...frame} durationInFrames={650} defaultProps={as<DollarProps>(dollarSample)} calculateMetadata={({ props }) => ({ durationInFrames: dollarDuration(props) })} />
    <Composition id="nuclear" component={Nuclear} {...frame} durationInFrames={650} defaultProps={as<NuclearProps>(nuclearSample)} calculateMetadata={({ props }) => ({ durationInFrames: nuclearDuration(props) })} />
    <Composition id="figure" component={Figure} {...frame} durationInFrames={450} defaultProps={as<FigureProps>(figureSample)} calculateMetadata={({ props }) => ({ durationInFrames: figureDuration(props) })} />
    <Composition id="cover" component={Cover} {...frame} durationInFrames={1} defaultProps={as<CoverProps>(coverSample)} />
    {/* the Story that follows a Reel onto the page */}
    <Composition id="story" component={Story} {...frame} durationInFrames={storyDuration()} defaultProps={as<StoryProps>(storySample)} />
  </>
);

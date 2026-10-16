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
import { hookExtra, withHook } from "./Hook";
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
// every Reel opens on its hook (Hook.tsx); the Story and the tile do not
const H = {
  dilemma: withHook(Dilemma),
  seat: withHook(Seat),
  region: withHook(Region),
  precedent: withHook(Precedent),
  talks: withHook(Talks),
  war: withHook(WarReplay),
  borders: withHook(Borders),
  arsenal: withHook(Arsenal),
  dollar: withHook(Dollar),
  nuclear: withHook(Nuclear),
  figure: withHook(Figure),
};
const as = <T,>(sample: unknown) => sample as T;
/**
 * A Reel's default content without a hook. Remotion fills a prop that is left
 * out from these defaults, so a sample's hook would otherwise open a real Reel
 * whose props carry none.
 */
const plain = <T,>(sample: unknown) => ({ ...(sample as object), hook: null }) as T;

export const Root: React.FC = () => (
  <>
    <Composition id="dilemma" component={H.dilemma} {...frame} durationInFrames={900} defaultProps={plain<DilemmaProps>(dilemmaSample)} calculateMetadata={({ props }) => ({ durationInFrames: dilemmaDuration(props) + hookExtra(props) })} />
    <Composition id="seat" component={H.seat} {...frame} durationInFrames={900} defaultProps={plain<SeatProps>(seatSample)} calculateMetadata={({ props }) => ({ durationInFrames: seatDuration(props) + hookExtra(props) })} />
    <Composition id="region" component={H.region} {...frame} durationInFrames={600} defaultProps={plain<RegionProps>(regionSample)} calculateMetadata={({ props }) => ({ durationInFrames: regionDuration(props) + hookExtra(props) })} />
    <Composition id="precedent" component={H.precedent} {...frame} durationInFrames={900} defaultProps={plain<PrecedentProps>(precedentSample)} calculateMetadata={({ props }) => ({ durationInFrames: precedentDuration(props) + hookExtra(props) })} />
    <Composition id="talks" component={H.talks} {...frame} durationInFrames={900} defaultProps={plain<TalksProps>(talksSample)} calculateMetadata={({ props }) => ({ durationInFrames: talksDuration(props) + hookExtra(props) })} />
    <Composition id="war" component={H.war} {...frame} durationInFrames={warDuration()} defaultProps={plain<WarProps>(warSample)} calculateMetadata={({ props }) => ({ durationInFrames: warDuration() + hookExtra(props) })} />
    <Composition id="borders" component={H.borders} {...frame} durationInFrames={bordersLength()} defaultProps={plain<BordersProps>(bordersSample)} calculateMetadata={({ props }) => ({ durationInFrames: bordersLength() + hookExtra(props) })} />
    <Composition id="arsenal" component={H.arsenal} {...frame} durationInFrames={750} defaultProps={plain<ArsenalProps>(arsenalSample)} calculateMetadata={({ props }) => ({ durationInFrames: arsenalDuration(props) + hookExtra(props) })} />
    <Composition id="dollar" component={H.dollar} {...frame} durationInFrames={650} defaultProps={plain<DollarProps>(dollarSample)} calculateMetadata={({ props }) => ({ durationInFrames: dollarDuration(props) + hookExtra(props) })} />
    <Composition id="nuclear" component={H.nuclear} {...frame} durationInFrames={650} defaultProps={plain<NuclearProps>(nuclearSample)} calculateMetadata={({ props }) => ({ durationInFrames: nuclearDuration(props) + hookExtra(props) })} />
    <Composition id="figure" component={H.figure} {...frame} durationInFrames={450} defaultProps={plain<FigureProps>(figureSample)} calculateMetadata={({ props }) => ({ durationInFrames: figureDuration(props) + hookExtra(props) })} />
    <Composition id="cover" component={Cover} {...frame} durationInFrames={1} defaultProps={as<CoverProps>(coverSample)} />
    {/* the Story that follows a Reel onto the page */}
    <Composition id="story" component={Story} {...frame} durationInFrames={storyDuration()} defaultProps={as<StoryProps>(storySample)} />
  </>
);

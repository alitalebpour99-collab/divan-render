import React from "react";
import { Composition } from "remotion";
import arsenalSample from "../samples/arsenal.json";
import cardsSample from "../samples/cards.json";
import bordersSample from "../samples/borders.json";
import dollarSample from "../samples/dollar.json";
import figureSample from "../samples/figure.json";
import nuclearSample from "../samples/nuclear.json";
import powerSample from "../samples/power.json";
import quizSample from "../samples/quiz.json";
import dilemmaSample from "../samples/dilemma.json";
import precedentSample from "../samples/precedent.json";
import regionSample from "../samples/region.json";
import coverSample from "../samples/seat.cover.json";
import seatSample from "../samples/seat.json";
import talksSample from "../samples/talks.json";
import warSample from "../samples/war.json";
import thenNowSample from "../samples/thennow.json";
import raceSample from "../samples/race.json";
import fiveSample from "../samples/five.json";
import { Arsenal, arsenalDuration, arsenalCues } from "./Arsenal";
import { Borders, bordersLength } from "./Borders";
import { CARD_H, CARD_W, Cards, cardsLength } from "./Cards";
import { Cover } from "./Cover";
import { Dilemma, dilemmaDuration } from "./Dilemma";
import { Dollar, dollarDuration, dollarCues } from "./Dollar";
import { Figure, figureDuration, figureCues } from "./Figure";
import { HOOK_FRAMES, HOOK_OVERLAP, withHook } from "./Hook";
import { layVoice, type Cues } from "./voice";
import { onStage } from "./Safe";
import { Nuclear, nuclearDuration, nuclearCues } from "./Nuclear";
import { Power, powerDuration } from "./Power";
import { Quiz, quizDuration, quizCues } from "./Quiz";
import { Precedent, precedentDuration, precedentCues } from "./Precedent";
import { Region, regionDuration, regionCues } from "./Region";
// the default content must hold no optional key: a Reel's props that leave one out would take the sample's value
import storySample from "../samples/story.json";
import { Seat, seatDuration, seatCues } from "./Seat";
import { Story, storyDuration } from "./Story";
import { Talks, talksCues, talksDuration } from "./Talks";
import { WarReplay, warDuration, warCues } from "./WarReplay";
import { ThenNow, thenNowDuration, thenNowCues } from "./ThenNow";
import { Race, raceDuration, raceCues } from "./Race";
import { Five, fiveDuration, fiveCues } from "./Five";
import type { Base, FiveProps, PowerProps, QuizProps, RaceProps, ThenNowProps } from "./props";
import type { ArsenalProps, BordersProps, CardsProps, CoverProps, DilemmaProps, DollarProps, FigureProps, NuclearProps, PrecedentProps, RegionProps, SeatProps, StoryProps, TalksProps, WarProps } from "./props";

// One composition per format of the page (the id is the format's id in
// lib/social/formats.ts of the site), all in the Reel frame, plus the still
// tile for the profile grid. The samples are only what the studio shows when
// no content is passed; a render always gets its content from the site.
const frame = { width: 1080, height: 1920, fps: 30 };
// every Reel opens on its hook (Hook.tsx) and is drawn on the safe stage (Safe.tsx); the Story and the tile do neither
const H = {
  dilemma: onStage(withHook(Dilemma)),
  seat: onStage(withHook(Seat)),
  region: onStage(withHook(Region)),
  precedent: onStage(withHook(Precedent)),
  talks: onStage(withHook(Talks)),
  war: onStage(withHook(WarReplay)),
  borders: onStage(withHook(Borders)),
  arsenal: onStage(withHook(Arsenal)),
  dollar: onStage(withHook(Dollar)),
  nuclear: onStage(withHook(Nuclear)),
  figure: onStage(withHook(Figure)),
  quiz: onStage(withHook(Quiz)),
  power: onStage(withHook(Power)),
  // the two short formats of 23 October 2026 open on their own question (hook null)
  thennow: onStage(withHook(ThenNow)),
  race: onStage(withHook(Race)),
  // the countdown of five figures opens on its theme, with the figure it ends on
  five: onStage(withHook(Five)),
};
const as = <T,>(sample: unknown) => sample as T;
const none = (): Cues => ({});
/**
 * A Reel's length and its narrator: the lines on their moments, the holds the
 * layout waits on, how long the hook stays (voice.ts). Without a narrator the
 * Reel runs as long as its layout and its hook, as before.
 */
const timed =
  <P extends Base>(body: (p: P) => number, cues: (p: P) => Cues) =>
  ({ props }: { props: P }) => {
    const lay = layVoice(props.voiceIn, cues(props), body(props), Boolean(props.hook?.text), HOOK_FRAMES, HOOK_OVERLAP);
    return { durationInFrames: lay.total, props: { ...props, voice: lay.voice, holds: lay.holds, hookLen: lay.hookLen } as P };
  };
/**
 * A Reel's default content without a hook. Remotion fills a prop that is left
 * out from these defaults, so a sample's hook would otherwise open a real Reel
 * whose props carry none.
 */
const plain = <T,>(sample: unknown) => ({ ...(sample as object), hook: null }) as T;

export const Root: React.FC = () => (
  <>
    <Composition id="dilemma" component={H.dilemma} {...frame} durationInFrames={900} defaultProps={plain<DilemmaProps>(dilemmaSample)} calculateMetadata={timed(dilemmaDuration, none)} />
    <Composition id="seat" component={H.seat} {...frame} durationInFrames={900} defaultProps={plain<SeatProps>(seatSample)} calculateMetadata={timed(seatDuration, seatCues)} />
    <Composition id="region" component={H.region} {...frame} durationInFrames={600} defaultProps={plain<RegionProps>(regionSample)} calculateMetadata={timed(regionDuration, regionCues)} />
    <Composition id="precedent" component={H.precedent} {...frame} durationInFrames={900} defaultProps={plain<PrecedentProps>(precedentSample)} calculateMetadata={timed(precedentDuration, precedentCues)} />
    <Composition id="talks" component={H.talks} {...frame} durationInFrames={900} defaultProps={plain<TalksProps>(talksSample)} calculateMetadata={timed(talksDuration, talksCues)} />
    <Composition id="war" component={H.war} {...frame} durationInFrames={warDuration()} defaultProps={plain<WarProps>(warSample)} calculateMetadata={timed<WarProps>(warDuration, warCues)} />
    <Composition id="borders" component={H.borders} {...frame} durationInFrames={bordersLength()} defaultProps={plain<BordersProps>(bordersSample)} calculateMetadata={timed<BordersProps>(bordersLength, none)} />
    <Composition id="arsenal" component={H.arsenal} {...frame} durationInFrames={750} defaultProps={plain<ArsenalProps>(arsenalSample)} calculateMetadata={timed(arsenalDuration, arsenalCues)} />
    <Composition id="dollar" component={H.dollar} {...frame} durationInFrames={650} defaultProps={plain<DollarProps>(dollarSample)} calculateMetadata={timed(dollarDuration, dollarCues)} />
    <Composition id="nuclear" component={H.nuclear} {...frame} durationInFrames={650} defaultProps={plain<NuclearProps>(nuclearSample)} calculateMetadata={timed(nuclearDuration, nuclearCues)} />
    <Composition id="figure" component={H.figure} {...frame} durationInFrames={450} defaultProps={plain<FigureProps>(figureSample)} calculateMetadata={timed(figureDuration, figureCues)} />
    <Composition id="quiz" component={H.quiz} {...frame} durationInFrames={480} defaultProps={plain<QuizProps>(quizSample)} calculateMetadata={timed(quizDuration, quizCues)} />
    <Composition id="power" component={H.power} {...frame} durationInFrames={1420} defaultProps={plain<PowerProps>(powerSample)} calculateMetadata={timed(powerDuration, none)} />
    <Composition id="thennow" component={H.thennow} {...frame} durationInFrames={thenNowDuration()} defaultProps={plain<ThenNowProps>(thenNowSample)} calculateMetadata={timed<ThenNowProps>(thenNowDuration, thenNowCues)} />
    <Composition id="race" component={H.race} {...frame} durationInFrames={raceDuration()} defaultProps={plain<RaceProps>(raceSample)} calculateMetadata={timed<RaceProps>(raceDuration, raceCues)} />
    <Composition id="five" component={H.five} {...frame} durationInFrames={fiveDuration(as<FiveProps>(fiveSample))} defaultProps={plain<FiveProps>(fiveSample)} calculateMetadata={timed<FiveProps>(fiveDuration, fiveCues)} />
    <Composition id="cover" component={Cover} {...frame} durationInFrames={1} defaultProps={as<CoverProps>(coverSample)} />
    {/* a post of several pictures: one card per frame, each saved as a still (1080 by 1350, Instagram's 4:5) */}
    <Composition id="cards" component={Cards} width={CARD_W} height={CARD_H} fps={30} durationInFrames={4} defaultProps={plain<CardsProps>(cardsSample)} calculateMetadata={({ props }) => ({ durationInFrames: cardsLength(props) })} />
    {/* the Story that follows a Reel onto the page */}
    <Composition id="story" component={Story} {...frame} durationInFrames={storyDuration()} defaultProps={as<StoryProps>(storySample)} />
  </>
);

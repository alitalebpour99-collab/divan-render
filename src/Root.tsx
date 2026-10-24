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
import { Arsenal, arsenalDuration } from "./Arsenal";
import { Borders, bordersLength } from "./Borders";
import { CARD_H, CARD_W, Cards, cardsLength } from "./Cards";
import { Cover } from "./Cover";
import { Dilemma, dilemmaDuration } from "./Dilemma";
import { Dollar, dollarDuration } from "./Dollar";
import { Figure, figureDuration } from "./Figure";
import { hookExtra, withHook } from "./Hook";
import { onStage } from "./Safe";
import { Nuclear, nuclearDuration } from "./Nuclear";
import { Power, powerDuration } from "./Power";
import { Quiz, quizDuration } from "./Quiz";
import { Precedent, precedentDuration } from "./Precedent";
import { Region, regionDuration } from "./Region";
// the default content must hold no optional key: a Reel's props that leave one out would take the sample's value
import storySample from "../samples/story.json";
import { Seat, seatDuration } from "./Seat";
import { Story, storyDuration } from "./Story";
import { Talks, talksDuration } from "./Talks";
import { WarReplay, warDuration } from "./WarReplay";
import { ThenNow, thenNowDuration } from "./ThenNow";
import { Race, raceDuration } from "./Race";
import type { PowerProps, QuizProps, RaceProps, ThenNowProps } from "./props";
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
    <Composition id="quiz" component={H.quiz} {...frame} durationInFrames={480} defaultProps={plain<QuizProps>(quizSample)} calculateMetadata={({ props }) => ({ durationInFrames: quizDuration(props) + hookExtra(props) })} />
    <Composition id="power" component={H.power} {...frame} durationInFrames={1420} defaultProps={plain<PowerProps>(powerSample)} calculateMetadata={({ props }) => ({ durationInFrames: powerDuration(props) + hookExtra(props) })} />
    <Composition id="thennow" component={H.thennow} {...frame} durationInFrames={thenNowDuration()} defaultProps={plain<ThenNowProps>(thenNowSample)} />
    <Composition id="race" component={H.race} {...frame} durationInFrames={raceDuration()} defaultProps={plain<RaceProps>(raceSample)} />
    <Composition id="cover" component={Cover} {...frame} durationInFrames={1} defaultProps={as<CoverProps>(coverSample)} />
    {/* a post of several pictures: one card per frame, each saved as a still (1080 by 1350, Instagram's 4:5) */}
    <Composition id="cards" component={Cards} width={CARD_W} height={CARD_H} fps={30} durationInFrames={4} defaultProps={plain<CardsProps>(cardsSample)} calculateMetadata={({ props }) => ({ durationInFrames: cardsLength(props) })} />
    {/* the Story that follows a Reel onto the page */}
    <Composition id="story" component={Story} {...frame} durationInFrames={storyDuration()} defaultProps={as<StoryProps>(storySample)} />
  </>
);

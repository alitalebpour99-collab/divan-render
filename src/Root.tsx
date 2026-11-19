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
import decadeSample from "../samples/decade.json";
import fiveSample from "../samples/five.json";
import trueFalseSample from "../samples/truefalse.json";
import versusSample from "../samples/set-versus-sau.json";
import decisionSample from "../samples/decision-oil.json";
import { Decision, DecisionCover, decisionMeta } from "./decision/Decision";
import type { DecisionCoverProps, DecisionProps } from "./decision/types";
import { Arsenal, arsenalDuration, arsenalCues } from "./Arsenal";
import { Borders, bordersLength } from "./Borders";
import { CARD_H, CARD_W, Cards, cardsLength } from "./Cards";
import { Cover } from "./Cover";
import { Dilemma, dilemmaDuration } from "./Dilemma";
import { Dollar, dollarDuration, dollarCues } from "./Dollar";
import { Figure, figureCues, figureDuration, figureLook } from "./Figure";
import { HOOK_FRAMES, HOOK_OVERLAP, withHook } from "./Hook";
import { layVoice, type Cues } from "./voice";
import { onStage } from "./Safe";
import { Nuclear, nuclearDuration, nuclearCues } from "./Nuclear";
import { Power, powerCues, powerDuration } from "./Power";
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
import { Decade, decadeDuration, decadeCues } from "./Decade";
import { Five, fiveCues, fiveDuration, fiveLook } from "./Five";
import { TrueFalse, trueFalseDuration, trueFalseCues } from "./TrueFalse";
import type { Base, DecadeProps, PowerProps, QuizProps, RaceProps, ThenNowProps, FiveProps, TrueFalseProps } from "./props";
import type { VersusProps } from "./props";
import type { ArsenalProps, BordersProps, CardsProps, CoverProps, DilemmaProps, DollarProps, FigureProps, NuclearProps, PrecedentProps, RegionProps, SeatProps, StoryProps, TalksProps, WarProps } from "./props";
// the content system's templates (T1, T2, T5, T6): in the studio and for the renderer, not planned by the site yet
import { Templates } from "./Templates";
import { NASKH, VAZIR } from "./kit";
import { EXTENTS, makeMap } from "./geo";
import { Table } from "./set/Table";
import { CoverSet } from "./set/CoverSet";
import { isSetFormat, planOf, setPossible, WAR_MAP, type SetFormat } from "./set/plans.ts";
import { fit, measure, ready } from "./set/fit.ts";
import type { Plan } from "./set/space.ts";

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
  // the hook shows the figure counting in its ring, the countdown its last board flipping (Hook.tsx, look)
  figure: onStage(withHook(Figure, figureLook)),
  quiz: onStage(withHook(Quiz)),
  power: onStage(withHook(Power)),
  // the two short formats of 23 October 2026 open on their own question (hook null)
  thennow: onStage(withHook(ThenNow)),
  race: onStage(withHook(Race)),
  // «دههٔ تو» (28 October 2026) opens on its own question too, the name very large on the old photo
  decade: onStage(withHook(Decade)),
  // the countdown of five figures opens on its theme, with the figure it ends on
  five: onStage(withHook(Five, fiveLook)),
  // the game «درست یا غلط» opens on its own title too
  truefalse: onStage(withHook(TrueFalse)),
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

/**
 * The set style (owner, 2026-11-13: the approved new style, in Divan's own
 * look): «عدد روز», «جنگ، روز به روز» and «دوراهی امروز», Divan's most posted
 * Reels, are drawn on the war-room table (src/set/). `style: "classic"` in the
 * props (the worker's DIVAN_STYLE=classic) draws them as before; `badge: false`
 * (DIVAN_BADGE=off) leaves the channel badge out. A Reel whose hook cannot be
 * seven words (a stand-in dilemma with a long question) keeps the classic look.
 * The plan, with every text already measured, travels in the props, so the
 * gate (gate.mjs) checks what was drawn.
 */
type Switches = { style?: string; badge?: boolean; plan?: Plan };
const FONTS = { vazir: VAZIR, naskh: NASKH };
const styled =
  <P extends Base>(format: SetFormat, classic: (x: { props: P }) => { durationInFrames: number; props: P }) =>
  async ({ props }: { props: P & Switches }) => {
    if (props.style === "classic" || !setPossible(props as never)) return classic({ props: { ...props, plan: undefined } });
    await ready([VAZIR, NASKH]);
    const map = format === "war" ? makeMap(EXTENTS.region, { x0: -WAR_MAP.w / 2, y0: -WAR_MAP.h / 2, x1: WAR_MAP.w / 2, y1: WAR_MAP.h / 2 }) : null;
    const plan = planOf(format, props, { fonts: FONTS, badge: props.badge !== false, voiceIn: props.voiceIn, measure }, map ? (lon, lat) => map.at(lon, lat) : undefined);
    // the voice as the plan placed it: the worker ducks the music under these lines
    const voice = plan.voice.map((v) => ({ file: v.file, from: v.from, frames: v.frames }));
    return { durationInFrames: plan.total, props: { ...props, plan, voice, holds: [], hookLen: 0 } };
  };
/** A format of the set style: the table when there is a plan, the classic look when there is not. */
const either = <P,>(Classic: React.FC<P>) => {
  const Comp: React.FC<P & Switches & { music?: string }> = (p) => (p.plan ? <Table plan={p.plan} music={p.music} /> : <Classic {...(p as P & React.JSX.IntrinsicAttributes)} />);
  return Comp;
};
const SetFigure = either(H.figure);
const SetWar = either(H.war);
const SetDilemma = either(H.dilemma);
/**
 * «ایران در برابر …» (2026-11-15) exists only in the set style: there is no
 * classic look to fall back to, so the switch DIVAN_STYLE=classic leaves it
 * on the table too.
 */
const versusMeta = async ({ props }: { props: VersusProps & Switches }) => {
  await ready([VAZIR, NASKH]);
  const plan = planOf("versus", props, { fonts: FONTS, badge: props.badge !== false, voiceIn: props.voiceIn, measure });
  return { durationInFrames: plan.total, props: { ...props, plan, voice: plan.voice.map((v) => ({ file: v.file, from: v.from, frames: v.frames })), holds: [], hookLen: 0 } };
};
const SetVersus: React.FC<VersusProps & Switches & { music?: string }> = (p) => (p.plan ? <Table plan={p.plan} music={p.music} /> : null);
/** The tile: a set format's tile is one object and its three or four big words, measured to fit. */
const CoverAny: React.FC<CoverProps & { fitted?: import("./set/space.ts").Line[]; style?: string }> = (c) => ((c.format as string) === "decision" ? <DecisionCover {...(c as unknown as DecisionCoverProps)} /> : c.fitted ? <CoverSet format={c.format} fitted={c.fitted} pair={c.pair} mark={c.mark} title={c.title} object={c.object} /> : <Cover {...c} />);
const coverMeta = async ({ props }: { props: CoverProps & { style?: string } }) => {
  // «ایران در برابر …» has only the set style's tile
  if (!isSetFormat(props.format) || (props.style === "classic" && props.format !== "versus") || !props.big) return { props };
  await ready([VAZIR, NASKH]);
  const fitted = fit({ text: props.big, width: 900, maxLines: 2, size: 120, min: 88, weight: 700, family: NASKH, color: "ink" }).lines;
  return { props: { ...props, fitted } };
};

export const Root: React.FC = () => (
  <>
    <Composition id="dilemma" component={SetDilemma} {...frame} durationInFrames={900} defaultProps={plain<DilemmaProps>(dilemmaSample)} calculateMetadata={styled<DilemmaProps>("dilemma", timed(dilemmaDuration, none)) as never} />
    <Composition id="seat" component={H.seat} {...frame} durationInFrames={900} defaultProps={plain<SeatProps>(seatSample)} calculateMetadata={timed(seatDuration, seatCues)} />
    <Composition id="region" component={H.region} {...frame} durationInFrames={600} defaultProps={plain<RegionProps>(regionSample)} calculateMetadata={timed(regionDuration, regionCues)} />
    <Composition id="precedent" component={H.precedent} {...frame} durationInFrames={900} defaultProps={plain<PrecedentProps>(precedentSample)} calculateMetadata={timed(precedentDuration, precedentCues)} />
    <Composition id="talks" component={H.talks} {...frame} durationInFrames={900} defaultProps={plain<TalksProps>(talksSample)} calculateMetadata={timed(talksDuration, talksCues)} />
    <Composition id="war" component={SetWar} {...frame} durationInFrames={warDuration()} defaultProps={plain<WarProps>(warSample)} calculateMetadata={styled<WarProps>("war", timed<WarProps>(warDuration, warCues)) as never} />
    <Composition id="versus" component={SetVersus} {...frame} durationInFrames={720} defaultProps={plain<VersusProps>(versusSample)} calculateMetadata={versusMeta as never} />
    <Composition id="borders" component={H.borders} {...frame} durationInFrames={bordersLength()} defaultProps={plain<BordersProps>(bordersSample)} calculateMetadata={timed<BordersProps>(bordersLength, none)} />
    <Composition id="arsenal" component={H.arsenal} {...frame} durationInFrames={750} defaultProps={plain<ArsenalProps>(arsenalSample)} calculateMetadata={timed(arsenalDuration, arsenalCues)} />
    <Composition id="dollar" component={H.dollar} {...frame} durationInFrames={650} defaultProps={plain<DollarProps>(dollarSample)} calculateMetadata={timed(dollarDuration, dollarCues)} />
    <Composition id="nuclear" component={H.nuclear} {...frame} durationInFrames={650} defaultProps={plain<NuclearProps>(nuclearSample)} calculateMetadata={timed(nuclearDuration, nuclearCues)} />
    <Composition id="figure" component={SetFigure} {...frame} durationInFrames={450} defaultProps={plain<FigureProps>(figureSample)} calculateMetadata={styled<FigureProps>("figure", timed(figureDuration, figureCues)) as never} />
    <Composition id="quiz" component={H.quiz} {...frame} durationInFrames={480} defaultProps={plain<QuizProps>(quizSample)} calculateMetadata={timed(quizDuration, quizCues)} />
    <Composition id="power" component={H.power} {...frame} durationInFrames={1420} defaultProps={plain<PowerProps>(powerSample)} calculateMetadata={timed(powerDuration, powerCues)} />
    <Composition id="thennow" component={H.thennow} {...frame} durationInFrames={thenNowDuration()} defaultProps={plain<ThenNowProps>(thenNowSample)} calculateMetadata={timed<ThenNowProps>(thenNowDuration, thenNowCues)} />
    <Composition id="race" component={H.race} {...frame} durationInFrames={raceDuration()} defaultProps={plain<RaceProps>(raceSample)} calculateMetadata={timed<RaceProps>(raceDuration, raceCues)} />
    <Composition id="decade" component={H.decade} {...frame} durationInFrames={decadeDuration(plain<DecadeProps>(decadeSample))} defaultProps={plain<DecadeProps>(decadeSample)} calculateMetadata={timed<DecadeProps>(decadeDuration, decadeCues)} />
    <Composition id="five" component={H.five} {...frame} durationInFrames={fiveDuration(as<FiveProps>(fiveSample))} defaultProps={plain<FiveProps>(fiveSample)} calculateMetadata={timed<FiveProps>(fiveDuration, fiveCues)} />
    <Composition id="truefalse" component={H.truefalse} {...frame} durationInFrames={trueFalseDuration(plain<TrueFalseProps>(trueFalseSample))} defaultProps={plain<TrueFalseProps>(trueFalseSample)} calculateMetadata={timed(trueFalseDuration, trueFalseCues)} />
    <Composition id="cover" component={CoverAny} {...frame} durationInFrames={1} defaultProps={as<CoverProps>(coverSample)} calculateMetadata={coverMeta as never} />
    {/* a post of several pictures: one card per frame, each saved as a still (1080 by 1350, Instagram's 4:5) */}
    <Composition id="cards" component={Cards} width={CARD_W} height={CARD_H} fps={30} durationInFrames={4} defaultProps={plain<CardsProps>(cardsSample)} calculateMetadata={({ props }) => ({ durationInFrames: cardsLength(props) })} />
    {/* the Story that follows a Reel onto the page */}
    <Composition id="story" component={Story} {...frame} durationInFrames={storyDuration()} defaultProps={as<StoryProps>(storySample)} />
    {/* «تصمیم امروز» and the formats of the same day's analysis (owner, 19 Nov 2026) */}
    <Composition id="decision" component={Decision} {...frame} durationInFrames={900} defaultProps={as<DecisionProps>(decisionSample)} calculateMetadata={decisionMeta as never} />
    <Templates />
  </>
);

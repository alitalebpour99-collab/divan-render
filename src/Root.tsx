import React from "react";
import { Composition } from "remotion";
import decisionSample from "../samples/decision-oil.json";
import { direct } from "./storyboard/director";
import { enrich } from "./storyboard/enrich";
import { storyboardChecks } from "./storyboard/checks";
import { fromDecision } from "./storyboard/fromDecision";
import { Reel, ReelCover, shipClocks } from "./storyboard/Reel";
import { RoomStory, storyDuration } from "./storyboard/RoomStory";
import type { ReelContent } from "./storyboard/types";
import type { DecisionProps } from "./decision/types";
import type { VoiceLine } from "./storyboard/director";

// ONE style (owner, 20 Nov 2026: «هر پروژه یک سبک»): the navy room of «تصمیم امروز». Every Reel of Divan is the
// composition «decision», drawn from a storyboard (src/storyboard): the twelve templates of the bible are content,
// not compositions. Props from before the storyboard engine (the card layout) are converted (fromDecision.ts). The
// old compositions (seat, region, figure, the set table …) are gone; the site plans none of them any more.
const frame = { width: 1080, height: 1920, fps: 30 };

type In = (ReelContent | DecisionProps) & { voiceIn?: VoiceLine[]; music?: string };
// round 3: every map beat brought up to a mark per 1.5 s from the ground in view (enrich.ts; never news)
export const contentOf = (p: In): ReelContent => enrich((p as ReelContent).engine === "storyboard" ? (p as ReelContent) : fromDecision(p as DecisionProps));

/** The storyboard, its checks, the narrator's lines where it put them: all known before a frame is drawn. */
const reelMeta = ({ props }: { props: In }) => {
  const content = contentOf(props);
  const storyboard = direct(content, props.voiceIn ?? []);
  const qc = storyboardChecks(content, storyboard);
  // pass 3: the ships' clocks (a column's place on its lane is searched once, here) travel with the storyboard
  const clocks = Object.fromEntries(shipClocks(content, storyboard));
  return {
    durationInFrames: storyboard.total,
    props: { ...content, voiceIn: props.voiceIn, music: props.music, storyboard: { ...storyboard, clocks }, qc, drone: true, voice: storyboard.voice.map((v) => ({ file: v.file, from: v.from, frames: v.frames })) },
  };
};

type CoverIn = { format?: string; kicker?: string; big?: string; title?: string; colors?: string[] };
const Cover: React.FC<CoverIn> = (c) => <ReelCover kicker={c.kicker ?? "دیوان"} big={c.big ?? c.title ?? ""} colors={c.colors} />;
type StoryIn = { kicker: string; title: string; mark?: string; ai: boolean; handle: string };

export const Root: React.FC = () => (
  <>
    <Composition id="decision" component={Reel as never} {...frame} durationInFrames={900} defaultProps={decisionSample as never} calculateMetadata={reelMeta as never} />
    <Composition id="cover" component={Cover} {...frame} durationInFrames={1} defaultProps={{ format: "decision", kicker: "تصمیم امروز", big: "نفت چطور برود؟" } as CoverIn} />
    <Composition id="story" component={RoomStory} {...frame} durationInFrames={storyDuration()} defaultProps={{ kicker: "تصمیم امروز", title: "نفت چطور برود؟", ai: true, handle: "@divan.ahura" } as StoryIn} />
  </>
);

// One composition alone, for working on it: node build.mjs cards
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/cards.json";
import { CARD_H, CARD_W, Cards, cardsLength } from "../Cards";
import type { CardsProps } from "../props";

registerRoot(() => (
  <Composition id="cards" component={Cards} width={CARD_W} height={CARD_H} fps={30} durationInFrames={4} defaultProps={sample as unknown as CardsProps} calculateMetadata={({ props }) => ({ durationInFrames: cardsLength(props) })} />
));

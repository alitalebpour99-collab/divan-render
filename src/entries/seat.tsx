// One composition alone, for working on it: node build.mjs seat
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/seat.json";
import { Seat, seatDuration } from "../Seat";
import type { SeatProps } from "../props";

registerRoot(() => (
  <Composition id="seat" component={Seat} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={sample as unknown as SeatProps} calculateMetadata={({ props }) => ({ durationInFrames: seatDuration(props) })} />
));

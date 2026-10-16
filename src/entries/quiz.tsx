// One composition alone, for working on it: node build.mjs quiz
import React from "react";
import { Composition, registerRoot } from "remotion";
import sample from "../../samples/quiz.json";
import { Quiz, quizDuration } from "../Quiz";
import type { QuizProps } from "../props";

registerRoot(() => (
  <Composition id="quiz" component={Quiz} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={sample as unknown as QuizProps} calculateMetadata={({ props }) => ({ durationInFrames: quizDuration(props) })} />
));

import React from "react";
import {Composition, registerRoot, type CalculateMetadataFunction} from "remotion";
import {MilestoneComposition, type MilestoneCompositionProps} from "./MilestoneComposition.tsx";

const defaultProps: MilestoneCompositionProps = {closingText: "Thank you for 47.8K followers", durationSeconds: 15, fps: 24};

export const calculateMilestoneMetadata: CalculateMetadataFunction<MilestoneCompositionProps> = ({props}) => ({
  durationInFrames: Math.max(1, Math.ceil(props.durationSeconds * props.fps)),
  fps: props.fps,
});

const Root: React.FC = () => (
  <Composition
    id="MilestoneVideo"
    component={MilestoneComposition}
    durationInFrames={360}
    fps={24}
    width={1080}
    height={1920}
    defaultProps={defaultProps}
    calculateMetadata={calculateMilestoneMetadata}
  />
);

registerRoot(Root);

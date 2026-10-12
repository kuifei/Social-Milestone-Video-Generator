import React from "react";
import {AbsoluteFill, Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";

export type MilestoneCompositionProps = {
  closingText: string;
  durationSeconds: number;
  fps: number;
};

export const MilestoneComposition: React.FC<MilestoneCompositionProps> = ({closingText}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const start = Math.max(0, durationInFrames - Math.round(3 * fps));
  const end = Math.min(durationInFrames - 1, start + Math.round(1.25 * fps));
  const opacity = interpolate(frame, [start, end], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  const translateY = interpolate(frame, [start, end], [28, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{backgroundColor: "#fff"}}>
      <OffthreadVideo src={staticFile("source.mp4")} style={{width: "100%", height: "100%", objectFit: "contain"}} />
      <AbsoluteFill style={{justifyContent: "flex-end", alignItems: "center", padding: "0 72px 150px", opacity}}>
        <div style={{fontFamily: 'Inter, Arial, "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif', fontSize: 68, lineHeight: 1.08, fontWeight: 750, color: "#111827", backgroundColor: "rgba(255,255,255,.92)", borderRadius: 20, padding: "20px 28px", textAlign: "center", transform: `translateY(${translateY}px)`}}>
          {closingText}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

import type {MilestoneScene} from "../scenes/milestone.js";

export const PEACE_SIGN_PROMPT_VERSION = "follower-drop-peace-sign-v6";

export const PEACE_SIGN_TEMPLATE = `REFERENCE MATERIAL AND FRAME
Create a 15-second, 9:16, fixed-camera 2D illustrated animation.
The profile screenshot is the only background and layout reference. The character sheet supplies only the same character's face, hair, glasses, outfit, body proportions, and illustration style; do not import its background color or lighting. Reference-image numbering follows the provider instructions preceding this prompt.

Treat the entire profile page as one static, front-facing image filling the frame, with its edges parallel to the frame. The white page and top/bottom padding retain the first frame's bright white color throughout. Keep the banner, buttons, icons, bio, post text, and embedded image thumbnails in their first-frame state. Thumbnails are static images: do not start playback or switch their content. Keep the camera, page size, position, and exposure fixed.
The performance happens in front of this flat image. Only one character, one small cake, number-candles, and a few paper confetti pieces move. Size the character so the full body is visible and the profile name and original follower count remain readable.

AVATAR AFTER THE EXIT
The main avatar circle is the character's small entrance. As the character leaves, remove the original portrait from the circle at the same time. After the exit, only the inside of that circle becomes an empty solid-black disk; its rim and position stay unchanged. This local fill is the only permitted page modification. All smaller avatars stay unchanged.

ACTION SEQUENCE
0.0-1.4 seconds: Inside the avatar circle, the character blinks gently, looks down at the page, then toward the intended destination with a small expectant smile. The shoulders lean forward slightly and both hands naturally reach the rim, preparing to come out.

1.4-4.0 seconds: The upper body emerges first, one foot steps over the rim, then the other follows. Release the hands and make one short, light hop. Move along one continuous small arc into open page space toward the lower right. Both feet stop at the same image height. Bend the knees slightly, let the body settle downward, then straighten naturally. Arms open a little for balance; hair and clothing settle a beat later. Like a 2D animated character completing a light landing in front of the page, the original page remains fully visible below the feet and neither foot touches an object. Settle once without repeated bouncing or vertical drifting.

4.0-5.5 seconds: Once the stance is stable, look toward the original RIGHT-HAND "{{followers}} Followers" statistic, then raise one hand to point at it. The gaze and fingertip share the same target. Never use the LEFT-HAND Following statistic. Keep the original number in its ordinary UI color and brightness; convey attention through the gesture alone.

5.5-9.0 seconds: Following the gesture, the character looks beside them. One small 2D cream cake slides smoothly in from the left and stops beside and slightly below the character, also in front of the page. The cake body itself is its lowest part. The original page stays visible below it, with no plate, board, or support.
A foreground copy of "{{followers}}" appears at the original follower-count location. Keeping its left-to-right order and spacing as one aligned row, the whole group follows a short arc down to the cake and becomes upright matte, colored wax number-candles. Every digit, decimal point, comma, and K/M suffix matches the original. Together the candles read only "{{followers}}". The original UI statistic remains untouched in its original position.

9.0-12.0 seconds: Tiny flames appear on the candle wicks in sequence. The character looks at the cake, gives a small satisfied nod, then turns toward the viewer with the head naturally upright, eyes open, and a relaxed closed-mouth smile. Raise one hand in a V gesture: index and middle fingers extended, the other fingers folded. Connect looking at the cake naturally to looking at the viewer.

12.0-15.0 seconds: Maintain the relaxed pose and clearly readable number-candles as a few colorful paper confetti pieces drift down. Tiny flames keep flickering. The character shows only subtle breathing motion and residual clothing movement. Keep the pose stable for approximately the final 0.7 seconds so the expression and cake are easy to read.

CONSTRAINTS THROUGHOUT
Use even, flat illustration brightness for the page. Draw tiny flames only at the wicks; they do not change surrounding colors or exposure. No spotlight, halo, glowing gold numbers, or vignette.
The original page remains visible below the feet and cake. Do not add a table, floor, pedestal, shadow, or curtain. Top and bottom padding belong to the original screenshot and keep their original color; do not construct another setting.
Postproduction captions will overlay the existing image. Reserving space means only keeping the character, hands, and flames away from the lowest area. Do not erase posts, pictures, or padding there, or draw a backing panel.
Keep existing text. The only new text shapes are the follower-count copy and matching number-candles described above. Generate no other writing, captions, bubbles, slogans, logos, or watermarks.
Use only the single reference character, performing actions with their own hands, in the original illustration style.
Audio: cheerful instrumental music with gentle exit, falling-number, and ignition sounds. No dialogue, narration, or vocals.
`;

export function renderPeaceSignPrompt(scene: MilestoneScene): string {
  return PEACE_SIGN_TEMPLATE.replaceAll("{{followers}}", scene.followerCount);
}

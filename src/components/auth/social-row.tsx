import { SocialButton } from "./auth-button";
import { AppleMark, GoogleMark } from "./brand-marks";

// `SocialRowLight` from the handoff: Google + Apple, each flex:1 in a 10px-gap row.
export function SocialRow() {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <SocialButton mark={<GoogleMark />} label="Google" className="au-social-flex" />
      <SocialButton
        mark={<AppleMark color="var(--steel-700)" />}
        label="Apple"
        className="au-social-flex"
      />
    </div>
  );
}

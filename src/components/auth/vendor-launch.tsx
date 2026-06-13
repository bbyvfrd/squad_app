import { Icon } from "@/components/ui/icon";

// Cross-app entry point — venue owners use a SEPARATE app, so this is a launch
// row, not a selectable role (see the venue-app scope rule). Reserved link target
// (`/venue` placeholder for now). stadium 26px → nearest 24; open_in_new 20px → 20.
export function VendorLaunch({ href = "/venue" }: { href?: string }) {
  return (
    <a className="role-vendor" href={href}>
      <span className="rv-ic">
        <Icon name="stadium" size={24} />
      </span>
      <span className="rv-txt">
        <span className="rv-name" style={{ display: "block" }}>
          Own or run a venue?
        </span>
        <span className="rv-sub" style={{ display: "block" }}>
          List pitches in the SQUAD Venues app
        </span>
      </span>
      <span className="rv-go">
        <Icon name="open_in_new" size={20} />
      </span>
    </a>
  );
}

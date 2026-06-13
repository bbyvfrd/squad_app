import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sports } from "@/lib/db/schema";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Card } from "@/components/ui/card";
import { SkillTag } from "@/components/ui/skill-tag";
import { SportChip } from "@/components/ui/sport-chip";
import { Spots } from "@/components/ui/spots";
import { StatusBadge } from "@/components/ui/status-badge";
import { Text } from "@/components/ui/text";
import { SPORT_UI, type SportKey } from "@/lib/ui/mappings";

// Render per-request, not at build: this page queries the DB for the seeded sport
// rail, and the production Docker image builds with a placeholder DATABASE_URL that
// is never dialed at build (postgres() is lazy). Static prerender would dial it and
// fail the no-DB image build. The DB is reached at request time (CI e2e + prod).
export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await db.select().from(sports).orderBy(asc(sports.displayOrder));
  return (
    <div className="flex flex-col gap-s3">
      <Text role="headline">FIND YOUR GAME</Text>

      <section aria-label="Browse by sport" className="flex gap-s1 overflow-x-auto">
        {rows.map((s) => (
          <SportChip key={s.key} sport={s.key as SportKey} />
        ))}
      </section>

      <section aria-label="Upcoming game">
        <Card href="/app">
          <div className="flex items-center justify-between">
            <strong>{SPORT_UI.football.label} · 7v7 · Sahil Park</strong>
            <StatusBadge kind="game" status="open" />
          </div>
          <SkillTag level="intermediate" />
          <Spots taken={8} capacity={14} />
          <AvatarStack names={["Farid B", "Aysel M", "Tural H", "Nigar K", "Elvin Q"]} />
        </Card>
      </section>
    </div>
  );
}

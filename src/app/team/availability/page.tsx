import { currentMember } from "@/lib/services/me";
import { availabilityRange } from "@/lib/services/team";
import { AvailabilityCalendar } from "./calendar";

export const metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const { member } = await currentMember();
  const start = new Date();
  start.setMonth(start.getMonth() - 2, 1);
  const end = new Date();
  end.setMonth(end.getMonth() + 13, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const data = await availabilityRange(member.id, iso(start), iso(end));
  return (
    <AvailabilityCalendar
      days={data.days.map((d) => ({ date: d.date, status: d.status, note: d.note, source: d.source }))}
      bookings={data.bookings.map((b) => ({ date: b.date, couple: b.couple, role: b.role, status: b.status, weddingId: b.wedding_id, city: b.city, start: b.start_time }))}
      rules={data.rules.map((r) => ({ id: r.id, weekdays: r.weekdays, status: r.status, start: r.start_date, end: r.end_date, note: r.note }))}
    />
  );
}

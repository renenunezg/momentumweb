// A 20 to 80 grade as a short filled bar, beside the number in the grade tables.
export function GradeBar({ grade }: { grade: number | null }) {
  const width = grade == null ? 0 : Math.max(0, Math.min(100, ((grade - 20) / 60) * 100));
  return (
    <span className="inline-block h-1.5 w-14 overflow-hidden rounded-[1px] bg-grid align-middle">
      <span className="block h-full bg-primary" style={{ width: `${width}%` }} />
    </span>
  );
}

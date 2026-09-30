export function baseOccupancyLabel(bases: number): string {
  if (bases === 0) return "Bases empty";
  if (bases === 7) return "Bases loaded";
  return `${["1st", "2nd", "3rd"].filter((_, i) => bases & (1 << i)).join(" & ")} occupied`;
}

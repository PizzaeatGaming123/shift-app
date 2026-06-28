interface SkeletonProps {
  height?: number;
  width?: number | string;
  radius?: number;
}

export function Skeleton({ height = 16, width = '100%', radius = 8 }: SkeletonProps) {
  return <span className="skeleton" style={{ height, width, borderRadius: radius }} />;
}

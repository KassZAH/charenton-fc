import { ResponsivePageContainer } from "@/components/ui/ResponsivePageContainer";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function StatsLoading() {
  return (
    <ResponsivePageContainer size="wide">
      <LoadingSkeleton lines={6} />
    </ResponsivePageContainer>
  );
}

import { getSettings } from "@/lib/store";
import { InppClient } from "./InppClient";

export default async function InppPage() {
  const settings = await getSettings();
  return (
    <InppClient
      inppTiers={settings.inppTiers}
      inppRate={settings.inppRate}
      inppSector={settings.inppSector}
      inppHeadcountForfait={settings.inppHeadcountForfait}
      inppLastAutoHeadcount={settings.inppLastAutoHeadcount}
    />
  );
}

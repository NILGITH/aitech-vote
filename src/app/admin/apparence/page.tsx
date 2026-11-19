import { getSettings } from "@/lib/settings";
import { PageTitle } from "@/components/admin/Shell";
import { AppearanceEditor } from "@/components/admin/AppearanceEditor";
import { saveAppearance } from "../actions";

export default async function AppearancePage() {
  const settings = await getSettings();
  return (
    <>
      <PageTitle title="Apparence du site" sub="Couleurs, polices, textes, sections de l'accueil et animations, sans toucher au code." />
      <AppearanceEditor settings={settings} action={saveAppearance} />
    </>
  );
}
